# BUG-073 — Mobile landing sidebar slides are not reachable: floating button disappears on scroll

**Severity:** LOW
**Affected page:** https://awesome.video/ at 375×812

## Reproduction
1. Open https://awesome.video/ in a fresh mobile chromium at 375×812.
2. Scroll halfway down the page.
3. The top-nav buttons (Home, Submit, Journeys, Advanced, Theme) stay
   visible but the sidebar category list is no longer accessible
   without scrolling back to top.
4. There's no visible "back to top" or floating sidebar toggle.

## Expected
A floating "back to top" / floating hamburger button so the user can
reach the sidebar at any scroll position.

## Actual
User must scroll up to find nav.

## Evidence
- `verify-findings.js`, `mobile_landing_search.png`

## Fix prompt

```
Task: Add a floating "back to top" button (or floating hamburger toggle)
on mobile viewports.

Acceptance:
1. Visible after scrolling >300 px on mobile.
2. Clicking scrolls back to top (or opens sidebar).
3. Verifiable with Playwright.
```
