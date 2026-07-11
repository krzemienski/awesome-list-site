# BUG-070 — "/" keyboard shortcut does nothing on / or anywhere on the public surface

**Severity:** LOW (UX)
**Affected page:** every public page

## Reproduction
1. Open https://awesome.video/ in a fresh chromium.
2. Make sure no input is focused. Press `/` on the keyboard.
3. Nothing visible happens. The landing has no search input (BUG-004).
4. The "Quick Actions" sidebar (right-rail) might have a "Search" entry,
   but pressing `/` doesn't trigger it.

## Expected
A future search affordance should bind "/" globally (with
event.preventDefault when no input is focused) to focus/open the
search bar.

## Actual
The shortcut is unbound; nothing happens.

## Evidence
- `wider-bugs.json` (`landingAllInputs: []`) and `public-deep` reports
- `screenshots/landing_search_check.png`

## Fix prompt

```
Task: When /resource/<n> implements a search affordance (fix BUG-004),
also wire the "/" keyboard shortcut to focus the search field.

Acceptance:
1. Loading / and pressing "/" focuses the search input (or opens a
   search modal).
2. Pressing Escape while focus is in the search clears it.
3. Verifiable with Playwright key events.
```
