# ux-public-secondary, cycle 05 (rev 63a1c79d at start and end): ISSUES, 1 LOW (PS-28; the auditor called it PS-27, renumbered because PS-27 is the retry loop). All earlier findings are FIXED.

| id | sev | URL | saw vs expected | evidence | source |
|---|---|---|---|---|---|
| PS-28 | LOW | /search?q=%3Cscript%3E (any page URL that carries a script-like string) | Shows "Search failed", and Retry never succeeds. Every in-page API fetch returns 403, including /api/version and /api/categories, because the edge WAF blocks requests whose Referer contains `<script>`. | Lead reproduced it with curl: /api/categories with that Referer returns 403 with no server header (an edge HTML "403 Forbidden"). With no Referer, or with Referer `%3Cb%3E`, it returns 200. /api/resources?search=<script> with no Referer returns 200. | Edge (Replit/Google front). App-side mitigation: send no full-URL Referer on same-origin API fetches. |

## Re-checks
- **Fixed:** PS-01 to PS-25.
- **#90, all three, verified on production:**
  - PS-22: offline, then Retry while offline, then reconnect. The page recovers on its own in about 0.5s, 3 of 3 runs, at 1440 and 820.
  - PS-23: the filter sheet stays open while toggling, and Done returns focus to the trigger.
  - PS-24: rows sit on a 44px pitch.
- **#87 PS-16 and #91 PS-25:** chips and the slug filter both work.

## Passed
- /search at 390: the filter sheet, invalid params (page, category and tag) and edge-case queries.
- Palette: Ctrl+K and Meta+K, the count, Enter and Escape.
- /advanced: all four tabs. The AI tab is ≥44px at 390.
- Journeys, plus Back focus.
- Static pages: one h1 each, no overflow.
- 404 variants: SSR 404 with noindex.
- Header aria-current (#86).
- Offline pages.

## UNVERIFIED (to the cycle-6 brief)
- Reduced motion.
- A full keyboard walk.
- Target sweeps at 820 and 1440 for every page.
- The /advanced Metrics and Export downloads.
- PS-14 re-measure.
- A sitemap and robots sample.
- A ruling on the footer "PRs welcome" link (73×24, inline).
