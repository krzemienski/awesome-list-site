# ux-public-secondary — cycle 03 (rev b89d3e4b, from 00:18:23Z) — ISSUES 7 (2 MEDIUM, 5 LOW); PS-09..14 FIXED
(saved by lead from the auditor's final message). Signed out, no writes. 1440 + 390 touch; 820 not driven.

| id | sev | URL | width | saw vs expected | evidence | likely source |
|---|---|---|---|---|---|---|
| PS-15 | LOW | /search?category=encoding-codecs&sort=bogus | 1440 | Sort combobox renders blank with an invalid sort | search-invalid-sort-1440.png | Search.tsx sort Select value |
| PS-16 | LOW | /search?...&sort=bogus&category=encoding-codecs | 1440 | invalid-filters state shows raw slug "encoding-codecs" with count 0 and tags "DASH 0"/"HLS 0"; same filter without bogus sort shows labels + real counts | search-invalid-sort-1440.png | SearchFilters.tsx invalid-state facet fallback |
| PS-17 | MEDIUM | /search?q=ffmpeg, /recommendations | 390 touch | result title links 256x42 (25 and 13 links), card 256x50, no overlay link; <44 touch rule | in-page sweep | resource card title anchor |
| PS-18 | LOW | /journeys | 390 touch | journey title links 248x39 / 248x43 | sweep | journeys card title link |
| PS-19 | MEDIUM | /advanced | 390 touch | 137 targets <44: tag pills 36px tall, "Show subcategories" 40x40 | sweep | client/src/components/features/advanced/* |
| PS-20 | LOW | /about | 390 touch | "Nick Krzemienski on GitHub" link 248x24, a flex block link (not inline text) | sweep | About.tsx |
| PS-21 | LOW | /design-system | 390 touch | demo "Example switch" 44x24 and "Example checkbox" 16x16 (specimens; maybe intentional) | sweep | DesignSystem.tsx |

## Re-checks: PS-09..PS-14 FIXED (PS-14 "Use phone" 62x44); PS-05, PS-08 spot-checked OK; PS-01..07 not fully re-driven.
## Passed: /search paging clamp, sort, legacy tags, invalid-filters panel; palette open/Enter/recent; contact dialog invalid flow + describedby resolve; /submit note role=note no h5; SSR parity on 20 routes; 404 variants; robots/sitemap (4,493); /notifications 302; no overflow + one h1 on 22 routes at 390.
## UNVERIFIED: Forgot password 44px; palette touch/Clear/descriptions; journey steps; theme apply; design-system content; cookie settings; sort listbox keyboard; Filters sheet 390; other 404 variants; 820 and 1440 target sweeps; keyboard/reduced motion; sitemap URL sampling.
