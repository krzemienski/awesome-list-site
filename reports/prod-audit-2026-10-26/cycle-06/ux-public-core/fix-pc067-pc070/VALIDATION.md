# C6 taxonomy fix evidence

Base: `520d6778369bc7ce495204cfcacc7e0533f941cc`. Isolated checkout: `/tmp/awesome-list-c6-taxonomy-20261027`, branch `fix/c6-pc067-taxonomy-recovery`. Real Express/Vite runtime on `http://127.0.0.1:5067`, loopback disposable PostgreSQL `awesome_c2_pubsec` (1,949 resources, Encoding & Codecs 372). Background jobs disabled; development startup skips migrations. No production database/session mutation, paid AI work, merge, or deployment.

The final proof uses a dedicated Chrome process on CDP 9268. Earlier dedicated 9267 captures remain supplemental. Browser evaluation was read-only except native focus/scroll; interactions used Chrome clicks, keyboard Enter/Space/Home/Delete, and real network offline emulation. No test files, mock endpoints, request stubs, validation scripts, or harnesses were added.

## Disposition

| Finding | Result | Exact proof |
|---|---|---|
| PC-067 | Guest parity proven; signed-in member activation UNVERIFIED | Grid Favorite/Bookmark use existing shared components. `step-107-grid-favorite-390-state.json` records false Favorite and real sign-in prompt; `step-108-grid-bookmark-390-state.json` records true device bookmark. List/Compact toggle states are in `step-109-list-actions-390-state.json` and `step-110-compact-actions-390-state.json`. Corresponding screenshots and AX semantic captures show each control. Tablet: `step-116-grid-actions-820-*`, `step-117-list-actions-820-*`, `step-118-compact-actions-820-*`. Desktop: `step-125-grid-actions-1440-*`, `step-126-list-actions-1440-*`, `step-127-compact-actions-1440-*`. |
| PC-068 | INVALID as an app defect; search code intentionally unchanged | The original empty fill operation changed the DOM value without changing React's search state. Real keyboard deletion restores 142 to 372, removes `search`, and issues an unfiltered request: `step-112-search-cleared-390-state.json`, `step-120-search-cleared-820-state.json`, `step-129-search-cleared-1440-state.json`. Before/after PNGs and AX captures retained. Prior Meta+A/Backspace observations are also in `step-033-search-cleared-390-state.json`, `step-022-search-cleared-820-state.json`, `step-048-search-cleared-1440-state.json`. No permanent-chip enhancement shipped, per Main's instruction. |
| PC-069 | Proven at all required widths | Typed 999 recovers to page 16 and shows the dismissible explanation. Nonnumeric abc remains inline-invalid. Direct cold document is HTTP 200, canonical page 16, with recovered listing and explanation. Phone: `step-114-typed-overflow-390-state.json`, `step-115-direct-overflow-390-state.json`, visible notice `step-124-visible-clamp-notice-390.png`. Tablet: `step-123-direct-overflow-820-state.json` plus step-121/122/123 PNG/AX. Desktop: `step-132-direct-overflow-1440-state.json` plus step-130/131/132 PNG/AX. Dismissal leaves focus on results. `step-040-subcategory-overflow-state.json` and `step-041-leaf-overflow-state.json` prove the other taxonomy levels. `step-042-invalid-document-404s.json` retains HTTP404 for invalid page text and unknown taxonomy. |
| PC-070 | Automatic recovery proven at all required widths; real stale background-refetch no-theft proven at 390 | Real offline page navigation, keyboard Retry, reconnect, results focus and next Tab are in `step-101-recovered-390-state.json`, `step-104-recovered-820-state.json`, `step-106-recovered-1440-state.json`. Each records exact CSS dimensions and touch state. In each, recovered focus is `taxonomy-results-region`; next Tab reaches the first card detail link. A real query older than 61 seconds refetches after reconnect without stealing search-input focus in `step-102-background-refetch-390-state.json` (three real listing requests, last request after the stale interval). Ordinary reconnect preserves search focus at 820/1440 in supplemental step-058/059 JSON, but those requests were fresh and did not constitute a background refetch. |

All filenames above are relative to this directory; each cited PNG has an adjacent accessibility capture. Fresh final screenshots were personally viewed. The screenshots show the existing dark site, reachable heart/bookmark controls, sign-in/device-save feedback, recovered last-page resources, and the explanatory notice without horizontal overflow. Captures taken during the existing entrance animation remain supplemental only; settled notice captures are step-124 and step-132. Grid keyboard walks at all three widths are retained in `step-055-grid-keyboard-1440.json`, `step-056-grid-keyboard-820.json`, `step-057-grid-keyboard-390.json`. Detail, tag expansion, outbound link, edit, Favorite, Bookmark, title appear once each in normal order; no nested interactive anchor was added.

## Checks and delivery

- `./node_modules/.bin/tsc --noEmit`: **exit 0**, unpiped.
- `npm run build`: **exit 0**, unpiped. Zod annotation, large-chunk and existing Home import-layout warnings remain. See `checks.txt`.
- `step-133-direct-document.html` is the actual cold HTML body; `step-133-direct-document.json` records HTTP 200 and canonical recovered state. `step-133-network.json` retains only URL/method/status data (no cookie or authorization headers); listing requests for page999 then page16 succeed. `step-133-console.json` has no error entries in that final target.

## Remaining UNVERIFIED

- Signed-in member Favorite/Bookmark writes: Main confirmed no approved development member credentials; no account creation, owner bypass, or auth change was attempted. The restored Grid controls reuse exactly the already-wired shared member action components.
- Real screen-reader speech, physical touch hardware, production verification and deployment were not performed. Touch was Chrome coarse-pointer emulation.
- A stale ordinary background refetch was measured at 390 only; 820/1440 recovered-focus paths were driven, and fresh ordinary reconnect retained input focus, but a stale background request at those widths was not captured.
- No global accessibility, design-system, full parity matrix, or whole-app regression PASS is claimed.

Browser tooling caveats were investigated rather than patched into production: empty MCP fill did not dispatch React change, initial browser helpers restored stale emulation or reused a target, and touch clicks can hit a just-appearing toast. Final critical phone proof explicitly focuses the intended semantic control before keyboard activation and records exact live viewport/touch state. Exploratory invalid artifacts were removed; valid final artifacts were not overwritten.

## Independent-review history correction

Source includes current origin/main `abe2341e`. The URL-sync effect now defers while an authoritative page exceeds totalPages, allowing the clamp state commit to retain its replace-only intent until page16 is written. No API or analytics change.

Real cold navigation after selecting Compact through the UI: `/about` (history length4) → `/category/encoding-codecs?page=999` → recovered `?page=16&view=compact` (length5); exactly one browser Back returns `/about` (length5). Evidence: `step-140-saved-compact-cold-history.json`, adjacent AX, `step-140-saved-compact-cold-overflow.png`, `step-141-one-back-leaves-overflow.png`.

Alias/query-order variant: `/about` → cold `?sort=desc&page=999` → recovered `?sortBy=name-desc&page=16&view=compact`; exactly one Back returns `/about`, not page999. Evidence: `step-142-sort-alias-reordered-history.json`, adjacent AX, and step-142/143 PNGs. HTTP200 retained in both cases.

Rechecks after this production change: `tsc --noEmit` exit0; `npm run build` exit0 (client3959 modules 7.08s, SSR309 modules1.47s; existing warnings unchanged). These runs supersede the earlier history gap only; other declared UNVERIFIED items remain.
