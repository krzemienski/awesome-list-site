# BUG-035 — Mobile menu (375×812) lacks an obvious hamburger toggle

**Severity:** HIGH (mobile UX)
**Affected page:** https://awesome.video/ at 375×812

## Reproduction
1. Open https://awesome.video/ in a fresh chromium at 375×812 (mobile)
2. The visible top bar shows the Home / Submit / Journeys / Advanced / Theme buttons.
3. With only 4 clickable links visible in the viewport and 218 internal sidebar links behind a sidebar that's not visibly toggled, mobile users have no way to surface the category tree that desktop users see.
4. There is no visible hamburger button on the mobile landing (the previous probe found no element matching /menu|hamburger|nav/ in aria-label).

## Expected
At 375×812, a hamburger menu that toggles the category sidebar should be visible. Today mobile users see only the standard top-bar chrome and have to scroll through 218 sidebar links with no toggle.

## Actual
The mobile-first hamburger toggle is absent or buried.

## Evidence
- `verify-findings.js` output and re-test: mobile landing shows only 4 link items visible
- `contrast-seo-vuln.json`, `mobileLanding.linksClickable: 4`
- `screenshots/mobile_landing_full.png`, `mobile_landing_search.png`

## Fix prompt

```
Task: At mobile (375×812), https://awesome.video/ has no prominent
hamburger toggle to reveal the category sidebar. Mobile-only users see
only the top-bar buttons and have no way to access the sidebar.

Reproduction: launch Chromium at 375×812, navigate to /, inspect the
top bar. Look for an aria-label matching /menu|hamburger/. Today none
exists.

Acceptance:
1. A clearly visible hamburger button appears in the mobile top bar
   (aria-label="Open menu" / similar).
2. Clicking it slides the category sidebar into view (or pushes
   content).
3. An "X" / "Close" affordance dismisses it.
4. Verifiable via Playwright at 375×812 viewport.
```
