# ux-a11y, cycle 05 (rev 63a1c79d at start and end): PASS, 0 new findings. Not counted as clean until the UNVERIFIED gaps close.

## Re-checks
- **PG-08:** fixed at 820, with and without a fragment, and on Back after scrolling.
- **PG-10:** fixed, Geist keyboard at 820.
- **Geist pointer at 820:** no ring, as intended.
- **OF-01 and PG-05:** fixed at 820. The page recovered in about 12s and focus went to the new H1.
- **PG-04:** consistent with fixed. It was not re-driven on Slow 3G.
- **Not re-driven:** PG-06, PG-07 and PG-09.

## Passed (cycle-4 gaps now closed)
- **Switch focus ring:** solid 2px plus a ring. Checked on the only signed-in Switch, the admin Resources edit dialog. Nothing was saved.
- **Contrast:** 0 failures across 10 accents × 2 design systems (20 combinations) on the category, tag, search and resource pages. The site is dark-only.
- **Favorite toast:** announced in a role=status, aria-live=assertive region. A mutation observer confirmed the insert.
- **Skip link, landmarks and headings:** all OK.

## UNVERIFIED (goes to the cycle-5 a11y gap run)
- Reduced motion, target sizes and 390 width this cycle.
- #90 PS-22/23 and the audit chips, from an a11y angle.
- The first-load case with no hash.
- A keyboard #fragment link to a heading.
- PG-06, PG-07 and PG-09 re-drive.
- The signed-in Favorite toast.
- Screen-reader speech.

## Brief correction
- agent-browser `--headers` expects JSON. Load the cookie only with `cookies set --curl <file>`.

## Gap run (rev 63a1c79d): ISSUES, 1 LOW
| id | sev | where | saw vs expected | source |
|---|---|---|---|---|
| PG-11 | LOW | /tag/hls, the "All related topics" link to #related-topics-heading, at 1440 and 820 | The heading scrolls into view (top=80) but is not focused. activeElement is BODY, no ring shows, and the heading has no tabindex. Expected the target to be focused, as PG-08 requires. The gap run also saw BODY on a direct load. That conflicts with run C, which saw the H2 focused on a direct load, so the fixer must reproduce both. | nav-history.ts useScrollToHash (same-document hash change only scrolls) |

- **Passed:**
  - Reduced motion on 4 pages.
  - Target sizes at 390 on 7 pages, including the Filters sheet.
  - PS-23 sheet: focus moves in, is trapped, aria-pressed is set, a live count is announced, and Escape and Done return focus to the trigger.
  - PS-22: offline and error pages focus the H1, show role=alert, and Retry has a 2px ring.
  - First load with no hash: focus is on BODY.
  - PG-06, PG-07 and PG-09 are fixed.
- **UNVERIFIED:**
  - Error-page auto-recover timing. This is under fix in #93.
  - Screen-reader speech.
