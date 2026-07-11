# BUG-065 — Resource count "1,952" is hard-coded on landing while actual count varies

**Severity:** MEDIUM
**Affected page:** https://awesome.video/

## Reproduction
1. The static chrome text reads "1,946+ resources" (in the title bar)
   and "1,952 resources" (in the top button).
2. Recent sitemap generators should reflect the live /api/awesome-list
   count. If the count is hard-coded ("1946+"), it will drift over time.

## Expected
The count is dynamic, computed server-side from /api/awesome-list.

## Actual
Appears static — the title bar uses literal "1,946+ resources" text.

## Evidence
- `landing-1440-initial.png` shows "1,946 resources"

## Fix prompt

```
Task: Hardcoded "1,946+ resources" / "1,952 resources" text in the
chrome of /. Today this drifts from the actual DB count.

Acceptance:
1. The display uses the live count from /api/awesome-list and updates
   after each successful data fetch.
2. The "+ appended" when the page is uncached or the count changes.
3. Verifiable: stop the database, the count should show 0 or a fallback,
   not "1946".
```
