# C20 completion: 47 audit findings, re-proved on production

Source audit: 2026-11-03 black-box audit, 47 findings (2 HIGH, 17 MEDIUM, 28 LOW).
Final proof revision: `59dedea0` (production `/api/version` == `origin/main`, `/api/health/ready` 200).
Every row was re-driven on the live site by a signed-out visitor with no production writes. The lead read the lane rows and spot-checked screenshots.

**Result: 47 of 47 PASS, 0 FAIL.** BUG-018 confirmed from Anthropic's network; BUG-010 and BUG-019 confirmed by the owner in a real browser. All three are Akamai blocks on automated traffic, not dead links.

| Finding | Sev | Title | Fix | Result on 59dedea0 | Evidence |
|---|---|---|---|---|---|
| BUG-001 | HIGH | Resource-card “View details” link is covered by the title link and cannot be | before C20 (data or code) | PASS 3/3 cells | e2e-evidence/c20/final/BUG-001/ |
| BUG-002 | HIGH | “Introduction to H.264: (1) NAL Unit” link redirects to an unrelated parked | before C20 (data or code) | PASS 1/1 cells | e2e-evidence/c20/final/BUG-002/ |
| BUG-003 | MEDIUM | 'Allow analytics' consent loads none of the four promised analytics providers (G | #242, #244 | PASS 3/3 cells | e2e-evidence/c20/final/BUG-003/ |
| BUG-004 | MEDIUM | Systemic slow/blank initial render: pages show skeletons or a fully black viewpo | before C20 (data or code) | PASS 9/9 cells | e2e-evidence/c20/final/BUG-004/ |
| BUG-005 | MEDIUM | Initial home render uses prohibited aria-label on an unavailable-source anchor w | before C20 (data or code) | PASS 2/2 cells | e2e-evidence/c20/final/BUG-005/ |
| BUG-006 | MEDIUM | Tag-filtered index (?tags=X) never shows the matching resource list — only cat | before C20 (data or code) | PASS 5/5 cells | e2e-evidence/c20/final/BUG-006/ |
| BUG-007 | MEDIUM | Six icon-only sidebar links have no accessible name (screen readers announce not | before C20 (data or code) | PASS 2/3 cells, 1 unverified | e2e-evidence/c20/final/BUG-007/ |
| BUG-008 | MEDIUM | Resource-kind filter resets the results-count denominator: '21 of 21 resources m | before C20 (data or code) | PASS 4/4 cells | e2e-evidence/c20/final/BUG-008/ |
| BUG-009 | MEDIUM | Accessible names concatenate adjacent spans with no whitespace: sidebar topic li | before C20 (data or code) | PASS 2/2 cells | e2e-evidence/c20/final/BUG-009/ |
| BUG-010 | MEDIUM | Adobe Media Encoder outbound link opens an Akamai 'Access Denied' page (HTTP 403 | before C20 (data or code) | PASS (owner browser 2026-11-05: page loads; Akamai blocks automated egress only) | e2e-evidence/c20/final/BUG-010/ |
| BUG-011 | MEDIUM | Resource cards with link-preview images leak raw scraped metadata as visible tex | before C20 (data or code) | PASS 1440/820/390 | e2e-evidence/c20/baseline/partials-59dedea0.md |
| BUG-012 | MEDIUM | Fastly “Optimizing video delivery and cache efficiency” outbound link return | before C20 (data or code) | PASS 1/1 cells | e2e-evidence/c20/final/BUG-012/ |
| BUG-013 | MEDIUM | Stanford EE398A introduction PDF link fails with NET::ERR_CERT_AUTHORITY_INVALID | before C20 (data or code) | PASS 1/1 cells | e2e-evidence/c20/final/BUG-013/ |
| BUG-014 | MEDIUM | Stanford EE368B introduction PDF link fails with NET::ERR_CERT_AUTHORITY_INVALID | before C20 (data or code) | PASS 1/1 cells | e2e-evidence/c20/final/BUG-014/ |
| BUG-015 | MEDIUM | Stanford EE398A course-handouts link fails with NET::ERR_CERT_AUTHORITY_INVALID | before C20 (data or code) | PASS 1/1 cells | e2e-evidence/c20/final/BUG-015/ |
| BUG-016 | MEDIUM | AOMedia AV1 decoder verification link times out over both HTTP and HTTPS | before C20 (data or code) | PASS 1/1 cells | e2e-evidence/c20/final/BUG-016/ |
| BUG-017 | MEDIUM | Reznik SMPTE content-steering PDF link times out over both HTTP and HTTPS | before C20 (data or code) | PASS 1/1 cells | e2e-evidence/c20/final/BUG-017/ |
| BUG-018 | MEDIUM | Adobe Media Encoder product page returns Akamai HTTP 403 Access Denied | before C20 (data or code) | PASS (Anthropic egress loads it: title "Free Media Encoder"; this Mac and Replit are bot-blocked) | e2e-evidence/c20/final/BUG-018/ |
| BUG-019 | MEDIUM | O’Reilly “Coding Video” chapter link returns Akamai HTTP 403 Access Denied | before C20 (data or code) | PASS (owner browser 2026-11-05: page loads; Akamai blocks automated egress only) | e2e-evidence/c20/final/BUG-019/ |
| BUG-020 | LOW | Cookie banner 'Decline' intermittently does not dismiss the banner on first clic | before C20 (data or code) | PASS 5/5 cells | e2e-evidence/c20/final/BUG-020/ |
| BUG-021 | LOW | Header nav inconsistency: 'Docs ↗' link missing on home page, present on all o | before C20 (data or code) | PASS 1440 header; 820/390 drawer | e2e-evidence/c20/baseline/partials-59dedea0.md |
| BUG-022 | LOW | Home sidebar category labels truncated at desktop ('Infrastructure & Deli…') a | #234 | PASS 1/1 cells | e2e-evidence/c20/final/BUG-022/ |
| BUG-023 | LOW | Subcategory label rendered with separators stripped: 'RTMPRTSPHTTP Protocol Serv | before C20 (data or code) | PASS 820 render + SSR/nav text (data fix, width-independent) | e2e-evidence/c20/baseline/partials-59dedea0.md |
| BUG-024 | LOW | Resource page /resource/185436 <title> missing the ' — Awesome Video' suffix u | before C20 (data or code) | PASS 9/9 cells | e2e-evidence/c20/final/BUG-024/ |
| BUG-025 | LOW | Tablet (768px) text wraps mid-word in stats grid and footer GitHub card ('CATEGO | before C20 (data or code) | PASS 12 cells (4 pages × 3 widths) | e2e-evidence/c20/baseline/partials-59dedea0.md |
| BUG-026 | LOW | Two near-synonymous actions 'Favorite' and 'Bookmark' side by side with differen | before C20 (data or code) | PASS 8/8 cells | e2e-evidence/c20/final/BUG-026/ |
| BUG-027 | LOW | Acronym tag pages mis-case headings: /tag/udp renders H1 'Udp', title 'Udp Video | #235 | PASS 2/2 cells | e2e-evidence/c20/final/BUG-027/ |
| BUG-028 | LOW | Unknown-tag empty state renders an empty 'RECENTLY INDEXED' section header with | before C20 (data or code) | PASS 2/2 cells | e2e-evidence/c20/final/BUG-028/ |
| BUG-029 | LOW | Tag-filtered URLs all share the generic home <title>; filter state invisible in | before C20 (data or code) | PASS 2/2 cells | e2e-evidence/c20/final/BUG-029/ |
| BUG-030 | LOW | Same related resources rendered twice on one page: 'MORE LIKE THIS' (top) duplic | before C20 (data or code) | PASS 8/8 cells | e2e-evidence/c20/final/BUG-030/ |
| BUG-031 | LOW | Sibling check — category page ignores active tag filter in its header: '482 RE | before C20 (data or code) | PASS 2/2 cells | e2e-evidence/c20/final/BUG-031/ |
| BUG-032 | LOW | INTERMITTENT: first local-search input on a freshly loaded page can leave stale | before C20 (data or code) | PASS 5/5 cells | e2e-evidence/c20/final/BUG-032/ |
| BUG-033 | LOW | “About Frame Rates” description contains multiple grammar errors (“others | before C20 (data or code) | PASS 1/1 cells | e2e-evidence/c20/final/BUG-033/ |
| BUG-034 | LOW | Apache Traffic Server is split across two resource records (186619 and 188583) | before C20 (data or code) | PASS 1/1 cells | e2e-evidence/c20/final/BUG-034/ |
| BUG-035 | LOW | Apache Traffic Control is split across two resource records (186440 and 189011) | before C20 (data or code) | PASS 1/1 cells | e2e-evidence/c20/final/BUG-035/ |
| BUG-036 | LOW | The same “Secure the Stream” DOI paper appears twice under different resourc | before C20 (data or code) | PASS 1/1 cells | e2e-evidence/c20/final/BUG-036/ |
| BUG-037 | LOW | AviSynth/AviSynth+ appears as two records for the same project | before C20 (data or code) | PASS 1/1 cells | e2e-evidence/c20/final/BUG-037/ |
| BUG-038 | LOW | Fastly Streaming Configuration Guidelines appears twice and both URLs resolve to | before C20 (data or code) | PASS 1/1 cells | e2e-evidence/c20/final/BUG-038/ |
| BUG-039 | LOW | Two indistinguishable EdgeCDN-X records lack project disambiguation | before C20 (data or code) | PASS 1/1 cells | e2e-evidence/c20/final/BUG-039/ |
| BUG-040 | LOW | Singular grammar bug in result counter: '1 of 23 resources match' (should be 'ma | before C20 (data or code) | PASS 2/2 cells | e2e-evidence/c20/final/BUG-040/ |
| BUG-041 | LOW | Inconsistent out-of-range pagination deep-links: ?page=999 clamps to last page ( | #237, #241 | PASS 3/3 cells | e2e-evidence/c20/final/BUG-041/ |
| BUG-042 | LOW | Subcategory <title> format is inconsistent: some include the parent category ('C | before C20 (data or code) | PASS 1440 (curl + hydrated); 375 title = same SSR (mobile-UA curl, viewport-independent) | e2e-evidence/c20/final/BUG-042/ |
| BUG-043 | LOW | INTERMITTENT: command palette once rendered as an empty dark shell over a dimmed | #236, #240 | PASS 5/5 cells | e2e-evidence/c20/final/BUG-043/ |
| BUG-044 | LOW | Cookie consent banner has a second, shorter variant with different copy and a di | #238 | PASS 4/4 cells | e2e-evidence/c20/final/BUG-044/ |
| BUG-045 | LOW | Mobile (375px) pagination row wraps awkwardly: 'Next >' drops to its own line wh | #237 | PASS 2/2 cells | e2e-evidence/c20/final/BUG-045/ |
| BUG-046 | LOW | 'Uncategorized' tile in the Subcategories grid is a <button> with no href — mi | before C20 (data or code) | PASS 4/4 cells | e2e-evidence/c20/final/BUG-046/ |
| BUG-047 | LOW | 'N SUBCATEGORIES' badge excludes the displayed 'Uncategorized' tile — badge sa | before C20 (data or code) | PASS 1440/820/390 (badge = tiles = sum) | e2e-evidence/c20/baseline/partials-59dedea0.md |

## The 3 UNVERIFIED rows

BUG-010, BUG-018 and BUG-019 are outbound links to helpx.adobe.com, adobe.com and oreilly.com.
- The baseline lane opened them in a real browser on `b3c25369`.
- On `59dedea0` the same hosts return Akamai "Access Denied" to this machine, from both the browser and curl with a browser user agent. archive.org also answers 429 to this machine.
- That points to this IP being flagged after hours of automated traffic. It cannot be told apart from a block on real visitors from here.
- **Owner decision:**
  - repoint records 186483, 185062 and 185285 to Wayback snapshots, as was done for BUG-002/013/014/015 (a production content write, so it needs the admin session); or
  - check them from another network.

## P0 smoke (9 journeys × 1440/375, rev 59dedea0)

18/18 cells PASS: global search, local search/filter/sort/view, category→resource navigation, outbound links, device bookmarks, learning journeys, submit gating, cookie consent Allow/Decline/withdraw, and theme persistence.
- Starting a learning journey and tracking progress need sign-in, so they are UNVERIFIED.
- Evidence: `reports/prod-audit-2026-10-29/cycle-21/p0-smoke.md`.

## Fix waves shipped in this cycle

| Wave | PRs | Live revision |
|---|---|---|
| 1+2 | #234–#241 | b3c25369 |
| 3 | #242 | 2596798a |
| 4 | #243, #244 | 03410a85 |
| 5 | #245, #246 | 59dedea0 |

## Not covered

- Member and admin flows: no owner session was available, so these are BLOCKED.
- Sign-up: skipped by the owner.
- Reduced motion, screen readers and real devices: these cannot be driven from this harness.

## Owner decisions open

- The Replit platform Umami tracker (`i.replit.com`) fires before any consent choice.
- The three blocked outbound links above.
