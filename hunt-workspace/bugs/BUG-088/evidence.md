# BUG-088 — Pending resource edit-history has no diff view in /admin

**Severity:** LOW
**Affected page:** /admin pending edits

## Reproduction
1. Open /admin → Edits tab (admin auth).
2. Each row shows the proposed change but there is no diff against the
   current state — only side-by-side text.

## Expected
A real diff (green/red highlights) for each field.

## Actual
Side-by-side plain text only.

## Evidence
- `screenshots/admin_dashboard.png`

## Fix prompt

```
Task: /admin → Edits tab should show a field-level diff (proposed vs
current value).

Acceptance:
1. Each pending edit row exposes a diff view (e.g., via a "View diff" button).
2. Verifiable with Playwright.
```
