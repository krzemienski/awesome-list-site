# BUG-074 — Admin dashboard has "Toggle Sidebar" but admin actually has 2 sidebars (left + right)

**Severity:** LOW
**Affected page:** /admin

## Reproduction
1. Open https://awesome.video/admin (with admin auth) in a fresh chromium at 1440×900.
2. The screen has THREE sidebars/render columns visible:
   - Left: public category tree (a sidebar built for end-users).
   - Center: tab content.
   - Right: "Quick Actions" panel with category tree embedded.

The "Toggle Sidebar" button collapses only one of them — the structure
is duplicated across at least two sidebars.

## Expected
The admin shell should not display the public-category sidebar at all
when the admin tab is active — that's a public surface, not a control.

## Actual
The admin layout shows the public category navigation, which is
duplicated with the Quick Actions panel.

## Evidence
- `screenshots/admin_dashboard.png`, `admin_a_loaded.png`
- visual inspection

## Fix prompt

```
Task: Hide the public category sidebar inside /admin. Show only the
admin-specific shell.

Acceptance:
1. /admin does not render the public category tree.
2. "Toggle Sidebar" controls the only sidebar present.
3. Verifiable: Playwright at /admin counts two visible sidebar columns
   at most, not three or more.
```
