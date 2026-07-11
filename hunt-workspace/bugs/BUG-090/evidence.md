# BUG-090 — /admin/categories renders a Categories nav header but the SPA shell doesn't load data fast

**Severity:** MEDIUM
**Affected page:** /admin/categories

## Reproduction
1. Open /admin/categories (with admin auth).
2. The page renders the same "Loading…" placeholder as /admin.
3. After 7-10s, the category management UI appears.

Same defect pattern as BUG-101 (admin dashboard) but applies to the
categories tab.

## Evidence
- `screenshots/admin_categories.png` (taken at 2.5s into navigation)

## Fix prompt

```
Task: /admin/categories takes 7-10s to render just like /admin. Add a
skeleton.

Acceptance:
1. /admin/categories renders the category list (or a named skeleton)
   within 2.5s.
2. Verifiable with Playwright.
```
