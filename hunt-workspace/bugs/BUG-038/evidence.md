# BUG-038 — /advanced?q=<query> ignores the query string (same body for ffmpeg vs asdfqwerty)

**Severity:** CRITICAL (core search-broken pattern, sibling of BUG-015)
**Affected page:** https://awesome.video/advanced

## Reproduction
```bash
for q in ffmpeg codec streaming asdfqwerty; do
  curl -s "https://awesome.video/advanced?q=$q" > /tmp/page.html
  echo -n "$q : "
  grep -c 'a href="/resource/' /tmp/page.html
done
```
All four return **0 resource cards** with the same 14256-byte body
(`19 category cards + 189 subcategory cards` — full sidebar tree,
identical between queries).

## Expected
`/advanced?q=ffmpeg` should filter to show only categories / subcats /
resources matching "ffmpeg" (i.e., a much smaller list). For "asdfqwerty"
(empty result) it should render an empty state.

## Actual
The query is silently dropped. Every request returns the full
unfiltered sidebar tree. Same defect pattern as BUG-015
(/api/resources?q=).

## Evidence
- `another-round.json`, `advanced_q_*` entries all show identical `catCards: 19`, `subcatCards: 189`, `resourceCards: 0`
- The placeholder on the input is "Search categories and resources..." — clearly meant to filter.

## Fix prompt

```
Task: GET https://awesome.video/advanced?q=<query> returns the same
unfiltered sidebar tree for any query string. Today the page shows
the full sidebar regardless of q.

Reproduction:
  curl -s "https://awesome.video/advanced?q=ffmpeg" | grep 'subcat' | wc
  curl -s "https://awesome.video/advanced?q=asdfqwerty" | grep 'subcat' | wc
→ both return 189.

Acceptance:
1. /advanced?q=ffmpeg reduces the visible category + subcategory list
   to those matching "ffmpeg" (or shows a "no results" empty state).
2. /advanced?q=asdfqwerty renders an empty state.
3. Verifiable with the same curl — distinct counts per query, or
   identical counts only when the sidebar is empty.
```
