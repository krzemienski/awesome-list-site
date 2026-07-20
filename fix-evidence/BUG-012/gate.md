# VG-012 — BUG-012 (MEDIUM): Journey CTAs are ellipsized

## Fix
`client/src/pages/Journeys.tsx`:
- **Root cause**: CTA labels sat in `truncate` spans, and the journey grid went to 3 columns at `lg` (1024px) while the docked sidebar left only ~220px per card — "Start Journey" → `Star…`, "Continue Journey" → `Co…`, "Completed · Review" → `Compl…`.
- Grid now `md:grid-cols-2 xl:grid-cols-3` (3 columns only from 1280px, where cards are wide enough). Skeleton grid updated to match.
- Removed `truncate` from all three CTA label spans; button gets `h-auto min-h-9 whitespace-normal` so in the worst case the label wraps to a second line instead of clipping — ellipsis is now impossible at any width.
- Decorative trailing `ArrowRight` hidden below 900px (`hidden min-[900px]:block`) to keep labels one-line in the tightest band.

## Live evidence (dev, real enrolled user via real APIs)
QA user `__qa_test_run22_bug012@example.com` created via POST /api/auth/register + local login; enrolled via POST /api/journeys/7/start + /api/journeys/10/start; progress via PUT /api/journeys/:id/progress — journey 7 = 1/6 steps ("Continue Journey"), journey 10 = 6/6 ("Completed · Review"), journeys 6/8/9 untouched ("Start Journey"). All three CTA states live on /journeys simultaneously.

Authed Playwright at every listed width — for each of the 5 CTA buttons asserted: label text exactly equals the full expected string, `scrollWidth ≤ clientWidth + 1` (no clipping), button right edge inside viewport, and `document.scrollWidth ≤ clientWidth` (no page horizontal overflow):

| Width | CTAs checked | clipped / wrong-label / overflow | max label lines | page horiz overflow |
|---|---|---|---|---|
| 768  | 5 | 0 | 2 | none |
| 850  | 5 | 0 | 2 | none |
| 950  | 5 | 0 | 2 | none |
| 1024 | 5 | 0 | 1 | none |
| 1100 | 5 | 0 | 1 | none |
| 1200 | 5 | 0 | 1 | none |

- No `Star…` / `Co…` / `Compl…` anywhere; where space is tightest (≤950px) labels wrap to a second line with the full text visible (screenshots inspected — buttons render cleanly).
- Clickability: at 768px, clicking `button-view-journey-7` navigated to `/journey/7` (URL proof).
- Screenshots: `bug-012-768.png` … `bug-012-1200.png` (one per width).

## Checks
- tsc --noEmit: clean.
- Teardown: user_journey_progress rows + `__qa_test_%` user deleted; net-zero verified (0 QA users, 0 orphan progress rows).

**Verdict: PASS**
