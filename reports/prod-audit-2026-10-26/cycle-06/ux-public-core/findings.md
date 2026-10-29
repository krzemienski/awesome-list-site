# ux-public-core, cycle 06 (rev 520d6778), run 20261027-c6pc: ISSUES — 4 new findings; full matrix incomplete

**Production revision:** `520d6778369bc7ce495204cfcacc7e0533f941cc` at start and end.
**Run:** `run-20261027-c6pc`, signed-out isolated Chrome context `c6-public-core-20261027`, dark scheme. Analytics was declined and `umami.disabled=1`; no production content rows were created and no member mutation or paid job was attempted. Evidence below is fresh from this run. Screenshots cited for findings were personally viewed. Console and network state were inspected during the executed journeys; expected offline failures produced `ERR_INTERNET_DISCONNECTED`, and Chrome also emitted form-field autofill recommendations.

The 200-request stop ended the lane before the complete width/state matrix was driven. Consequently, partial journeys are reported as such and no inventory row is upgraded to PASS by assumption.

## New findings

| id | severity | URL | width | saw vs expected | evidence | likely source |
|---|---|---|---|---|---|---|
| C6-PC-067 | MEDIUM | `/category/encoding-codecs?sortBy=name-desc&kind=libraries` | 1440, default Grid view | The Xuggler grid card exposes only **View details**, **Open Link**, and its title, at rest and on hover. There is no Favorite or Bookmark action, although List and Compact expose both and C6-PC-043 requires parity in every view. | `/Users/nick/Desktop/awesome-list-site/reports/prod-audit-2026-10-26/cycle-06/ux-public-core/run-20261027-c6pc/step-026-grid-hover-no-personal-actions-1440.png` (grid card has no personal actions); `/Users/nick/Desktop/awesome-list-site/reports/prod-audit-2026-10-26/cycle-06/ux-public-core/run-20261027-c6pc/step-026-grid-hover-no-personal-actions-1440-state.json` (zero Favorite/Bookmark buttons); `/Users/nick/Desktop/awesome-list-site/reports/prod-audit-2026-10-26/cycle-06/ux-public-core/run-20261027-c6pc/step-024-list-view-guest-actions-1440.png` and `step-025-compact-view-1440.png` (working parity in the other views). | `client/src/pages/TaxonomyListing.tsx:677-691` (view-dependent card rendering) |
| C6-PC-068 | LOW | `/category/encoding-codecs?search=ffmpeg&sortBy=name-desc` | 1440 | After clearing **Search in Encoding & Codecs**, the input is empty but the URL still contains `search=ffmpeg`, results remain narrowed to 171, and no new API request or removable search chip appears. Expected clearing the search to remove the filter and restore the unfiltered count. | `/Users/nick/Desktop/awesome-list-site/reports/prod-audit-2026-10-26/cycle-06/ux-public-core/run-20261027-c6pc/step-030-clear-search-alone-stale-1440.png`; `/Users/nick/Desktop/awesome-list-site/reports/prod-audit-2026-10-26/cycle-06/ux-public-core/run-20261027-c6pc/step-030-clear-search-alone-stale-1440-state.json`; `/Users/nick/Desktop/awesome-list-site/reports/prod-audit-2026-10-26/cycle-06/ux-public-core/run-20261027-c6pc/step-030-clear-search-alone-stale-1440-a11y.txt`. | `client/src/pages/TaxonomyListing.tsx:642` (input only updates state); `client/src/pages/TaxonomyListing.tsx:659-660` (active search chip only while the tools panel is closed) |
| C6-PC-069 | LOW | `/category/encoding-codecs?page=999` and typed page jump | 820 touch | Typed `999` silently rewrites to page 25 with no dismissible clamp notice; direct navigation to `?page=999` renders generic **Page Not Found**, despite the API returning `totalPages:25`. Expected out-of-range recovery with a clamp and dismissible notice, not a silent clamp or generic 404. Nonnumeric `abc` correctly gets an inline error. | `/Users/nick/Desktop/awesome-list-site/reports/prod-audit-2026-10-26/cycle-06/ux-public-core/run-20261027-c6pc/step-020-page-clamp-820-state.json` (no status or notice); `/Users/nick/Desktop/awesome-list-site/reports/prod-audit-2026-10-26/cycle-06/ux-public-core/run-20261027-c6pc/step-021-direct-page-999-820.png`; `/Users/nick/Desktop/awesome-list-site/reports/prod-audit-2026-10-26/cycle-06/ux-public-core/run-20261027-c6pc/step-021-direct-page-999-listing.network-response.network-response`; `/Users/nick/Desktop/awesome-list-site/reports/prod-audit-2026-10-26/cycle-06/ux-public-core/run-20261027-c6pc/step-019-page-invalid-820.png` (working nonnumeric error). | `client/src/pages/TaxonomyListing.tsx:240-241`, `client/src/pages/TaxonomyListing.tsx:320-324`, `client/src/pages/TaxonomyListing.tsx:671` |
| C6-PC-070 | LOW | `/category/encoding-codecs?page=2` | 820 touch, offline→online | The page automatically recovers after reconnect, but settled focus is on `BODY`, not the new H1 or results region. The Retry button disappeared with the offline card, leaving no meaningful keyboard position. Expected sensible focus on recovered content. | `/Users/nick/Desktop/awesome-list-site/reports/prod-audit-2026-10-26/cycle-06/ux-public-core/run-20261027-c6pc/step-017-recovered-page2-820-state.json`; `/Users/nick/Desktop/awesome-list-site/reports/prod-audit-2026-10-26/cycle-06/ux-public-core/run-20261027-c6pc/step-017-recovered-page2-820.png`; `/Users/nick/Desktop/awesome-list-site/reports/prod-audit-2026-10-26/cycle-06/ux-public-core/run-20261027-c6pc/step-017-recovered-page2-820-a11y.txt`. | `client/src/pages/TaxonomyListing.tsx:295-300` (results focus only when its pending flag is set) |

## Earlier-cycle re-checks

- **PC-25 — FIXED at 820 touch.** The filters sheet stays open while Open Source and AV1 are toggled, the full tag search works, the footer has no tag row beneath it, and Done is 44px high. The dialog is 1180px high; Done ends at 1168px, leaving only 12px of blank bottom padding. Evidence: `/Users/nick/Desktop/awesome-list-site/reports/prod-audit-2026-10-26/cycle-06/ux-public-core/run-20261027-c6pc/step-012-filters-sheet-820.png`, `step-012-filters-sheet-820-geometry.json`, `step-013-facets-selected-820.png`, and `step-014-facets-done-820-focus.json`.
- **PS-29 — offline half FIXED; online-unreachable UNVERIFIED.** At both 390 and 820, offline copy is explicit, Retry adds **“Still offline — reconnect and try again.”**, and reconnection recovers without a reload loop. Evidence: `/Users/nick/Desktop/awesome-list-site/reports/prod-audit-2026-10-26/cycle-06/ux-public-core/run-20261027-c6pc/step-010-offline-retry-390.png`, `step-010-offline-retry-390-state.json`, `step-011-recovered-390.png`, `step-016-offline-retry-820.png`, and `step-017-recovered-page2-820.png`. The online-but-server-unreachable branch was not exercised: production fault injection, request blocking, mocks, and stubs were prohibited and the server stayed reachable.
- **PG-11 — UNVERIFIED.** First/repeated `#related-topics-heading` activation, direct fragment loading, malformed/missing fragments, and fragment Back/Forward were not reached. Only first-load/no-fragment and the first skip-link Tab stop were proven (below).
- **PG-03 — scoped 390 card-order check passes, not a full recheck.** Keyboard order was Filters & view → View details → Open Link → title, with a visible ring. Evidence: `/Users/nick/Desktop/awesome-list-site/reports/prod-audit-2026-10-26/cycle-06/ux-public-core/run-20261027-c6pc/step-007-card-tab-1.json`, `step-007-card-tab-2.json`, `step-007-card-tab-3.json`, `step-007-card-tab-4.json`, and `step-008-card-tab-details-390.png`.
- **PG-02 and earlier PC-01 through PC-24 — UNVERIFIED as complete re-checks.** They were not all re-driven in this run; prior FIXED claims are not inherited as fresh proof.

### Cycle-5 gaps assigned to this lane

| Gap | Result | Evidence / exact reason |
|---|---|---|
| First load, no fragment at 390 | **PASS (scoped).** Initial focus is BODY, content is visible, and first Tab reaches the skip link with a 2px ring. | `/Users/nick/Desktop/awesome-list-site/reports/prod-audit-2026-10-26/cycle-06/ux-public-core/run-20261027-c6pc/step-002-home-390-firstload-state.json`; `/Users/nick/Desktop/awesome-list-site/reports/prod-audit-2026-10-26/cycle-06/ux-public-core/run-20261027-c6pc/step-003-home-390-first-tab.json`; `/Users/nick/Desktop/awesome-list-site/reports/prod-audit-2026-10-26/cycle-06/ux-public-core/run-20261027-c6pc/step-001-home-390-initial.png`. |
| Fragment → page → Back at 390 using keyboard | **UNVERIFIED.** Not executed before the stop. | No fragment journey was started. |
| Offline at 390 and 820 | **PASS for copy/Retry/reconnect; C6-PC-070 records the 820 focus defect.** | `/Users/nick/Desktop/awesome-list-site/reports/prod-audit-2026-10-26/cycle-06/ux-public-core/run-20261027-c6pc/step-009-offline-390.png`, `step-010-offline-retry-390.png`, `step-011-recovered-390.png`, `step-015-offline-820.png`, `step-016-offline-retry-820.png`, `step-017-recovered-page2-820.png`. |
| Card Tab walk | **PASS at 390 only; 820/1440 UNVERIFIED.** All card controls reached in logical order with visible focus. | `/Users/nick/Desktop/awesome-list-site/reports/prod-audit-2026-10-26/cycle-06/ux-public-core/run-20261027-c6pc/step-007-card-tab-title-390.png`; `/Users/nick/Desktop/awesome-list-site/reports/prod-audit-2026-10-26/cycle-06/ux-public-core/run-20261027-c6pc/step-008-card-tab-details-390.png`. |
| 820 filters sheet after PC-25 | **PASS (scoped).** | PC-25 evidence above. |
| Tag typed jump | **PASS for valid page 3 and nonnumeric validation at 820; out-of-range behavior is C6-PC-069.** | `/Users/nick/Desktop/awesome-list-site/reports/prod-audit-2026-10-26/cycle-06/ux-public-core/run-20261027-c6pc/step-018-page-jump-820.png`, `step-018-page-jump-820-state.json`, `step-019-page-invalid-820.png`. |

## Row-by-row inventory disposition

`UNVERIFIED` means the full expected behavior and required width/state matrix was not completed; partial observations are listed so no executed work is hidden.

| Row | Verdict | Fresh evidence and exact remaining reason |
|---|---|---|
| C6-PC-001 | UNVERIFIED | `/api/auth/user` and `/api/config` returned 200 at 390 and `/api/awesome-list/nav` returned 200 on later taxonomy loads (`step-002-home-390-firstload-state.json`, `step-006-av1-390-a11y.txt`). Loading and failure/retry states and other widths were not completed. |
| C6-PC-002 | UNVERIFIED | Brand activation, focus/scroll, and signed-in variant not driven. |
| C6-PC-003 | UNVERIFIED | Drawer opened and closed by the nested AV1 link at 390 (`step-005-drawer-390-open.png`, `step-006-av1-390.png`). Backdrop, Escape, full trap/restore checks, and 820 were not completed. |
| C6-PC-004 | UNVERIFIED | Palette button, Ctrl/Cmd+K, `/`, and slash-inside-field cases not driven. |
| C6-PC-005 | UNVERIFIED | Header destinations, new-tab safety, aria-current, and role-conditional Admin not driven. |
| C6-PC-006 | UNVERIFIED | Guest account menu routes and return-sign-in URL not driven. |
| C6-PC-007 | UNVERIFIED | No signed-in account-menu journey; sign-out was prohibited. Unread badge source not checked. |
| C6-PC-008 | UNVERIFIED | More-navigation destinations and disclosure close not driven. |
| C6-PC-009 | UNVERIFIED | Encoding & Codecs expanded with `aria-expanded` at 390, but **All in category** and persistence were not activated/verified (`step-005-drawer-390-open-a11y.txt`). |
| C6-PC-010 | UNVERIFIED | Nested Codecs disclosure and AV1 leaf worked at 390 (`step-006-av1-390-a11y.txt`); other widths and focus assertions were not completed. |
| C6-PC-011 | UNVERIFIED | Sub-subcategory route was sampled, but Uncategorized/general links and parent-total reconciliation were not driven. |
| C6-PC-012 | UNVERIFIED | Compact rail at 1100/1200/1250/1440 not driven. |
| C6-PC-013 | UNVERIFIED | Nested link closed the drawer at 390; blank/nonblank drawer search, all named links, and 820/member/admin cases were not completed. |
| C6-PC-014 | UNVERIFIED | Populated nav rendered. Skeleton, genuine empty tree, and nav-failure Retry were not safely available/driven. |
| C6-PC-015 | UNVERIFIED | Breadcrumb/ancestor-disclosure and invisible-Tab-stop checks not driven. |
| C6-PC-016 | UNVERIFIED | Back-to-top appearance, footer/banner collision, scroll, and heading focus not driven. |
| C6-PC-017 | UNVERIFIED | Footer Home/category links not driven. |
| C6-PC-018 | UNVERIFIED | External footer destinations, `noopener noreferrer`, and disabled-repo variant not driven. |
| C6-PC-019 | UNVERIFIED | Policy/contact destinations, Cookie settings reopen, and contact variants not driven. |
| C6-PC-020 | UNVERIFIED | Decline persisted and analytics stayed disabled at 390 (`step-004-home-390-declined.png`, `step-004-home-390-controls.json`). Accept/vendor loading, Privacy, Escape, reopen, and 820/1440 were not completed; Accept was intentionally not clicked after the instruction to decline analytics. |
| C6-PC-021 | UNVERIFIED | Palette close methods, transient query clearing, and opener focus not driven. |
| C6-PC-022 | UNVERIFIED | Empty-palette category/featured/page jumps and API-backed defaults not driven. |
| C6-PC-023 | UNVERIFIED | Palette result query, grouped results, View all, and no-match case not driven. |
| C6-PC-024 | UNVERIFIED | Recent selection, Clear recents, focus, and five-item cap not driven. |
| C6-PC-025 | UNVERIFIED | Palette loading/error/offline/over-limit/auxiliary failures not driven. |
| C6-PC-026 | UNVERIFIED | Real home counts rendered at 390 and 1440 (`step-001-home-390-initial-a11y.txt`, `step-033-home-kind-cleared-1440-a11y.txt`). Home error/offline/empty distinctions were not completed. |
| C6-PC-027 | UNVERIFIED | Index/Curated preference, URL override, persistence, and signed-in PUT behavior not driven. |
| C6-PC-028 | UNVERIFIED | Visible home search blank/nonblank submission and keyboard/touch operation not driven. |
| C6-PC-029 | UNVERIFIED | Tools, Libraries, Standards, Events, and Protocols were all toggled at 1440 with real counts; Tools second-click cleared (`step-033-home-kind-cleared-1440-a11y.txt`, `step-034-home-tag-filter-1440-a11y.txt`). Other widths and every second-click case were not completed. |
| C6-PC-030 | UNVERIFIED | Home tag popover opened, full-set `srt` search found tags, and SRT filtering worked at 1440 (`step-034-home-tag-filter-1440-a11y.txt`). Sort, chip removal/Clear all, disabled state, and other widths were not completed. |
| C6-PC-031 | UNVERIFIED | Home category/subcategory/+N routes were not activated. |
| C6-PC-032 | UNVERIFIED | Home title/details/external-link behavior and stretched-card child-control checks were not driven. |
| C6-PC-033 | UNVERIFIED | A home tag pill was activated at 1440, but +N more/Show fewer and host-filter behavior were not driven. |
| C6-PC-034 | UNVERIFIED | Recent/featured cards and Submit CTA not driven. |
| C6-PC-035 | UNVERIFIED | Account-context onboarding, dismissal, and recommendation routes not driven. |
| C6-PC-036 | UNVERIFIED | A–Z, Z–A, most, and fewest all worked at 1440; Back/Forward and `sort=most` normalization worked (`step-032-categories-1440-a11y.txt` plus live navigation). Error state and 820/390 were not completed. |
| C6-PC-037 | UNVERIFIED | Populated category cards rendered at 1440 (`step-032-categories-1440.png`); error Retry, genuine empty, and other widths not completed. |
| C6-PC-038 | UNVERIFIED | Breadcrumb and nested drawer navigation were sampled at 390 (`step-006-av1-390-a11y.txt`); complete parent/child/sibling routes and kind preservation across all levels/widths were not completed. |
| C6-PC-039 | UNVERIFIED | Tools panel opened and `ffmpeg` produced 38 results with a real API request at 1440 (`step-027-collection-search-1440.png`, `step-027-collection-search-1440-state.json`). Other widths and complete focus behavior were not completed; clearing is defective under C6-PC-068. |
| C6-PC-040 | UNVERIFIED | Child Codecs and Uncategorized scopes and tile-off worked at 1440 (`step-028-scope-search-kind-1440-a11y.txt`). Zero-count scope and other widths were not completed. |
| C6-PC-041 | UNVERIFIED | Kind Libraries and A–Z/Z–A filtering worked with real counts at 1440; history was exercised. Other widths and Default reset were not completed. |
| C6-PC-042 | UNVERIFIED | 820 sheet toggle/search/Clear all/Done and footer were proven (`step-012` through `step-014`). Desktop sidebar facets, no-facets message, Escape, and 390 were not completed. |
| C6-PC-043 | **FAIL — C6-PC-067** | Grid loses Favorite/Bookmark parity. List and Compact expose both, but default Grid has none at rest or hover. All other card assertions were not needed to establish this defect. |
| C6-PC-044 | **FAIL — C6-PC-068** | Tag chip removal/Clear all worked at 820, but clearing collection search at 1440 leaves stale URL/results and no chip. Fuzzy and unsupported-filter cases were not completed. |
| C6-PC-045 | **FAIL — C6-PC-069** | Valid typed page 3 and nonnumeric inline error worked at 820; out-of-range recovery is defective. First/middle/last keyboard/blur coverage at other widths was not completed. |
| C6-PC-046 | UNVERIFIED | Offline taxonomy states and reconnect were driven at 390/820 (`step-009` through `step-017`); direct `?page=999` 404 was captured. Loading skeletons, server/facet errors, invalid-filter recovery, and genuine empty results were not completed. |
| C6-PC-047 | UNVERIFIED | Tag Back to Home and Search all resources attribution not driven. |
| C6-PC-048 | UNVERIFIED | Related-topic links and PG-11 fragment scroll/focus matrix not driven. |
| C6-PC-049 | UNVERIFIED | Guest favorite prompted sign-in and guest bookmark saved locally on a List card at 1440 (`step-024-list-view-guest-actions-1440.png`). Member mutations, edit/tag actions, #82 tag-card variant, and other widths were not completed. |
| C6-PC-050 | UNVERIFIED | `/tag/:slug` pagination, loading/error/offline/empty, and zero-total 404 were not driven. Category typed jump evidence does not prove the tag route. |
| C6-PC-051 | UNVERIFIED | Resource Back with in-app history and deep-link fallback not driven. |
| C6-PC-052 | UNVERIFIED | Resource taxonomy/tag authoritative slugs and unresolved text behavior not driven. |
| C6-PC-053 | UNVERIFIED | Resource primary/canonical external links and member interaction telemetry not driven. |
| C6-PC-054 | UNVERIFIED | Only the signed-out favorite toast was driven (`step-024-list-view-guest-actions-1440-a11y.txt`). Member add/remove, optimistic failure reversion, and list refresh were not attempted under the production write restrictions. |
| C6-PC-055 | UNVERIFIED | Only guest local bookmark save was driven. Notes, collections, member dialog, and Undo were not driven. |
| C6-PC-056 | UNVERIFIED | Native share, cancellation, and clipboard fallback not driven. |
| C6-PC-057 | UNVERIFIED | Suggest Edit auth wall and member edit validation/submission not driven; no edit row or paid AI action was attempted. |
| C6-PC-058 | UNVERIFIED | Broken-link report dialog and member submission not driven. |
| C6-PC-059 | UNVERIFIED | Related resources, More like this, collection/tag/search discovery links and state distinctions not driven. |
| C6-PC-060 | UNVERIFIED | Image failure, metadata collapse, and admin Edit deep link not driven. |
| C6-PC-061 | UNVERIFIED | Resource loading/error/offline/malformed-ID states not driven. |
| C6-PC-062 | UNVERIFIED | A real offline lazy-chunk failure at 390 recovered on reconnect (`step-009` through `step-011`). Online-unreachable probe bound, guarded-reload count, and generic route crash were not driven. |
| C6-PC-063 | UNVERIFIED | Only category `?page=999` 404 was sampled (`step-021-direct-page-999-820.png`). Other 404 variants, suggestion/noindex/OG assertions, and rooted-telemetry body checks were not completed. |
| C6-PC-064 | UNVERIFIED | Legacy/alias matrix and safe `next` handling not driven. |
| C6-PC-065 | UNVERIFIED | Shared collection populated/empty/error/offline/404 states not driven. |
| C6-PC-066 | UNVERIFIED | One guest resource was saved locally (`step-024-list-view-guest-actions-1440-state.json`). `/bookmarks` empty/populated rendering, per-ID failures, cap/storage-unavailable behavior, offline recovery, and account merge were not completed. |

## Additional required checks not reached

- Cold signed-out `/search?q=%3Cscript%3E`, including asset/API 403s, Referer, and console cleanliness: **UNVERIFIED**.
- Online-but-server-unreachable copy and five-probe bound/navigation cancellation: **BLOCKED without a real outage**; no safe production mechanism was available and mocks/request blocking were prohibited.
- Full PG-11 fragment matrix and keyboard fragment→page→Back: **UNVERIFIED**.
- Genuine empty nav/category/collection states and populated member/admin variants: **UNVERIFIED**; no eligible real data/session was established, and no fixture or production write was used.
- Real screen-reader speech and real coarse-pointer input: **BLOCKED by unavailable real modalities**; touch emulation was used only where reported.

No row was silently dropped: all 66 assigned IDs appear above with a verdict and the exact executed evidence or remaining reason.