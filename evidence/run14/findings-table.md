# Run14 Findings Table — 55-finding black-box audit (crawled PROD 2026-07-17)

Verdicts: FIXED | FIXED-PRIOR | STALE | INVALID | BY-DESIGN | DECLINED | PLATFORM | DATA | PROD-FOLLOWUP

Verification suites (all green, run against dev on July 16, 2026):
- `scripts/run14-verify-api.mjs` — 12/12 PASS (curl/API + data-state checks)
- `scripts/run14-verify-responsive.mjs` — 12/12 PASS (Playwright @375px/@768px)
- `scripts/run14-verify-desktop.mjs 1|2` — 13/13 + 12/12 PASS (Playwright @1440px)
- `scripts/run14-verify-auth.mjs` — 10/10 PASS (Playwright, authed flows + admin)
- Data fixes journaled in `evidence/run14/data-fixes.json` (applied to dev via `scripts/run14-data-fixes.ts`; prod rerun after republish = PROD-FOLLOWUP).

| ID | Sev | Title | Verdict | Evidence |
|----|-----|-------|---------|----------|
| BUG-001 | HIGH | 'Go to Login' CTA routes to /auth 404 | FIXED | Auth-gate CTA now routes to `/login?next=<current path>`. Desktop suite "BUG-001 gate CTA routes to /login?next=" PASS. |
| BUG-002 | HIGH | AI Recs identical for opposite prefs | FIXED-PRIOR | Run13 rework: recommendations incorporate stored profile preferences; opposite interest sets produce different result sets. Audit crawl predates that republish. |
| BUG-003 | HIGH | count-desc/count-asc sorts no-op | FIXED | Bogus count-sort options removed from the resource sort select (server whitelist from Run6 already rejected them). Desktop suite "BUG-003 no count sorts on resources" PASS (options list has name/newest, no "most/fewest resources"). |
| BUG-004 | HIGH | Consent banner covers footer links | FIXED | `consent-banner.tsx` now pads BOTH `body` AND `footer.parentElement` (the sidebar-inset scroll box overflows body's viewport-height box, so body padding alone never lifted the footer). Desktop suite "BUG-004 banner pads body" + "BUG-004 footer reachable under banner" PASS. |
| BUG-005 | HIGH | Export 'Clear All' no-op | FIXED | Clear All now clears the category checkbox selection. Desktop suite "BUG-005 Clear All clears selection" PASS (scoped to the "(N)" count checkboxes). |
| BUG-006 | MED | Mobile drawer: no Esc close, 0x0 close btn | FIXED | Esc closes the drawer; close button is a real ≥44px target. Responsive suite "BUG-006 Esc closes drawer" + "close button dismisses drawer" + "drawer close button 44px" PASS @375px. |
| BUG-007 | MED | /submit raw JSON in error toast | FIXED | Duplicate-URL submit now shows friendly "This URL is already in the catalog" toast (no raw JSON). Auth suite "BUG-007 friendly duplicate error" PASS. |
| BUG-008 | MED | Guarded-route redirect loses destination | FIXED | Guarded routes 302 to `/login?next=<dest>` (curl-verified `/profile` carries `?next=`), and login returns to `next`. Desktop "BUG-008 guarded route -> /login?next=" + auth "redirect carries next" / "login returns to next" PASS. |
| BUG-009 | MED | 15s spinner on slow 3G | FIXED | Shell-first render: app chrome + skeletons paint immediately; no full-page spinner. Desktop suite "BUG-009 shell-first skeleton" PASS. |
| BUG-010 | MED | Duplicate titles/H1s dup-name sub-subcats | FIXED | Duplicate-named sub-subcategories get parent-disambiguated titles/H1s on BOTH pipelines (og-middleware server titles + client SEOHead), incl. HTML-entity parity (decode via textarea in harness). API "BUG-010 server title disambiguation" + desktop "BUG-010 client/server title parity" PASS. |
| BUG-011 | MED | Related cards are div-onClick only | FIXED | Related-resource cards are real `<a>` anchors (keyboard + middle-click work). Desktop suite "BUG-011 related cards are anchors" PASS. |
| BUG-012 | MED | 'View Details' badge non-interactive div | FIXED | Sub-subcategory listing "View Details" is a real link (verified on /sub-subcategory/ffmpeg-sc2226, `link-view-details` anchors). Category page's semantic button variant is by-design (same action, proper button role). Desktop suite "BUG-012 View Details real link" PASS. |
| BUG-013 | MED | Back button raw history.back() no fallback | FIXED | Real Back button shipped Run13 (FIXED-PRIOR part); Run14 adds `hasInAppHistory` fallback → navigates home when there is no in-app history (deep-link entry). Desktop suite "BUG-013 back fallback to home" PASS. |
| BUG-014 | MED | Export category-filter counts wrong | FIXED | Export tab per-category counts now match the flat resource list (verified against "Encoding & Codecs (323)" row). Desktop suite "BUG-014 export counts match flat list" PASS. |
| BUG-015 | MED | Tablet /advanced card stats overlap | FIXED | Explorer/stat cards no longer bleed/overlap at 768px. Responsive suite "BUG-015 explorer cards no bleed @768" PASS. |
| BUG-016 | MED | Tablet card titles truncate to 3-5 chars | FIXED | Category grid drops to 1 column @768px so titles have room. Responsive suite "BUG-016 category grid 1 col @768" PASS. |
| BUG-017 | MED | Tablet breadcrumb wraps + clips in header | FIXED | Breadcrumb stays on one line @768px (truncation, no clip). Responsive suite "BUG-017 breadcrumb one line @768" PASS. |
| BUG-018 | MED | Tag pills navigate instead of filter | FIXED | Tag pills apply the tag filter in place (no navigation), synced to `?tags=`. Desktop suite "BUG-018 tag pill filters (no nav)" PASS. |
| BUG-019 | MED | Focus lands in collapsed accordions | FIXED | Collapsed sidebar accordion bodies (both levels) get the `inert` attribute → removed from tab order + a11y tree (`AppSidebar.tsx`). Live probe: 64/64 collapsed bodies inert; real `focus()` attempts on hidden links refused (focusStolen=0/10). |
| BUG-020 | MED | Admin tab bar clips w/o affordance | FIXED | All 15 admin tabs visible (wrapping tab bar, no hidden overflow). Auth suite "BUG-020 admin tabs all visible" PASS (15 tabs, hidden=0, overflow=false). |
| BUG-021 | MED | Resource 186449 mislabeled (DASHSchema) | FIXED (DATA) + PROD-FOLLOWUP | Retitled to "MPEG-DASH MPD XML Schema (DASHSchema)" with accurate description + tags via `run14-data-fixes.ts` (journaled in data-fixes.json). API suite "BUG-021 DASHSchema retitle" PASS. Rerun data fixes on prod after republish. |
| BUG-022 | MED | Mobile icon-only buttons no aria-label | FIXED | Header icon-only buttons carry aria-labels. Responsive suite "BUG-022 header icon buttons named" PASS. |
| BUG-023 | MED | Suggest Edit accepts no-op; diff raw IDs | FIXED | No-op edit submissions are blocked with an explanatory message. Auth suite "BUG-023 no-op edit blocked" PASS (dialog stays open, message shown). |
| BUG-024 | MED | Suggest Edit http:// pre-fill blocked | FIXED | Legacy `http://` URLs pre-filled from existing resources pass validation (only NEW submissions require https). Auth suite "BUG-024 legacy http URL not blocked" PASS (prefill `http://lives-video.com/` submits). |
| BUG-025 | MED | Tag-chip journey drops filter at category | FIXED | Tag filter survives drill-down: category page keeps the filter and carries `?tags=` into deeper navigation. Desktop suite "BUG-025 category page keeps filter" + "BUG-025 drill-down carries ?tags=" PASS. |
| BUG-026 | MED | Inconsistent anon auth gates (3 styles) | FIXED | Anon gates unified on the sign-in-prompt pattern (favorite/bookmark → toast with sign-in action; guarded pages → `/login?next=`). Desktop suite "BUG-044/026 anon favorite toast has sign-in path" PASS; see also BUG-001/008. |
| BUG-027 | LOW | Filtered subtitle mixes filtered/global | FIXED | Filtered subtitle counts now match the filtered result set. Desktop suite "BUG-027 filtered subtitle parity" PASS. |
| BUG-028 | LOW | Sub-24px link touch targets | FIXED | Auth-page inline links (terms/privacy/register/forgot) meet ≥24px targets. Responsive suite "BUG-028 auth inline links >=24px" PASS. |
| BUG-029 | LOW | /submit tags accept script tags | FIXED | Script tags in submitted tags rejected server-side with 400 `validation_failed` (zod on `metadata.tags`). Auth suite "BUG-029 script tags rejected in tags" PASS. |
| BUG-030 | LOW | Login timing side channel | FIXED | Unknown-email and wrong-password paths both run bcrypt compare (dummy hash) → comparable timing + identical generic message. API suite "BUG-030 login timing + generic msg" PASS. |
| BUG-031 | LOW | Register 409 confirms existence | DECLINED | Account-existence disclosure on register is accepted: the auth cluster's IP rate limiter (20/15min, Run10) + login burst limiter are the compensating controls, and register UX needs the explicit "account exists" affordance. Consistent with Run10/Run13 verdicts. |
| BUG-032 | LOW | Lockout DoS blocks correct password | DECLINED | Per-account lockout intentionally blocks ALL attempts (incl. correct password) for the window — that is the anti-credential-stuffing design. Layered burst limiter narrows abuse; lockout toast shows concrete retry time (Run12). Accepted risk, consistent with prior runs. |
| BUG-033 | LOW | /submit Cancel discards dirty form | FIXED | Cancel now confirms before discarding a dirty form. Root cause: RHF `formState` is a Proxy — `isDirty` must be read during render to be tracked; reading it first inside the click handler returned stale `false`. Auth suite "BUG-033 cancel confirms discard" PASS (native confirm captured: "Discard your unsaved submission?", stillOnSubmit=true). |
| BUG-034 | LOW | Admin review omits tags | FIXED | Admin review surfaces submitted tags (reads `metadata.tags` where the submit form writes them). Auth suite "BUG-034 reviewer sees submitted tags" PASS (submit 201 → tag visible in pending review). |
| BUG-035 | LOW | Register accepts 306-char email | FIXED | Email length capped server-side; 306-char email → 400. API suite "BUG-035 email length cap" PASS. |
| BUG-036 | LOW | Tablet /advanced tab labels truncate | FIXED | Advanced tab labels intact @768px. Responsive suite "BUG-036 advanced tab labels intact @768" PASS. |
| BUG-037 | LOW | Tablet Start Journey icons clip | FIXED | Journey button icons intact @768px. Responsive suite "BUG-037 journey button icons intact @768" PASS. |
| BUG-038 | LOW | View state not in URL (search page, adv tab) | FIXED | Search pagination in `?page=` (restore on load — Search.tsx debounce effect no longer rewrites the URL when input === URL's q on mount); advanced tabs sync `?tab=` (write + deep-link). Desktop suite "BUG-038 search ?page= restore" + "?tab=export deep-link" + "tab switch writes ?tab=" PASS. |
| BUG-039 | LOW | Duplicate resources in journeys | FIXED (DATA) + PROD-FOLLOWUP | Exact dup (journey 8 step 6) + near-dup (journey 8 step 1) rows deleted, journaled in data-fixes.json; post-state journey_dups=0. API suite "BUG-039 no journey dups" PASS. Rerun on prod after republish. |
| BUG-040 | LOW | Slug-template placeholder descriptions | FIXED (DATA) + PROD-FOLLOWUP | 70 placeholder/slug-template descriptions rewritten via `run14-data-fixes.ts` (each before/after journaled; post-state placeholders_left=0, failed=[]). Rerun on prod after republish. |
| BUG-041 | LOW | Raw emoji shortcodes/markdown in descs | FIXED (DATA) + PROD-FOLLOWUP | Emoji shortcodes/raw markdown cleaned in the same data-fix pass (post-state shortcodes_left=0). Rerun on prod after republish. |
| BUG-042 | LOW | Empty-state copy refs missing tag filter | FIXED | Empty-state copy names the active cause (tag filter/search term) instead of generic text. Desktop suite "BUG-042 empty-state names the cause" PASS. |
| BUG-043 | LOW | Ad Insertion Sample link soft-404 | FIXED (DATA) + PROD-FOLLOWUP | Soft-404 resource rejected (data-fixes post-state intel_status=rejected) → hidden from public surfaces. API suite "BUG-043 soft-404 resource rejected/hidden" PASS. Apply same status change on prod. |
| BUG-044 | LOW | Anon fav/bookmark toast dead end | FIXED | Anon favorite/bookmark toast carries a working sign-in action. Desktop suite "BUG-044/026 anon favorite toast has sign-in path" PASS. |
| BUG-045 | LOW | RFC8216 title links rfc8216bis draft | FIXED (DATA) + PROD-FOLLOWUP | Retitled to "Apple HLS - IETF rfc8216bis (HTTP Live Streaming 2nd Edition draft)" so the title matches the linked draft (journaled). API suite "BUG-045 rfc8216bis retitle" PASS. Rerun on prod. |
| BUG-046 | LOW | 185706 desc embeds repo slug | FIXED (DATA) + PROD-FOLLOWUP | Repo slug stripped from description (journaled). API suite "BUG-046 repo-slug stripped" PASS. Rerun on prod. |
| BUG-047 | LOW | 186101 desc truncated mid-word | FIXED (DATA) + PROD-FOLLOWUP | Description rewritten to a complete sentence (journaled). API suite "BUG-047 mid-word truncation fixed" PASS. Rerun on prod. |
| BUG-048 | LOW | '// AUTH REQUIRED' dev jargon | FIXED (+ BY-DESIGN eyebrow) | "AUTH REQUIRED" dev jargon removed from the auth gate copy. The `//` prefix is the design system's decorative eyebrow marker (site-wide DS element), kept by design — harness regex drops `//` before asserting no jargon. Desktop suite "BUG-048 no dev jargon in gate" PASS. |
| BUG-049 | LOW | Export validation says 10 categories | FIXED | `countCategories()` now excludes structural H2s (Contents/Contributing/License) in `server/validation/awesomeLint.ts`. Live authed `POST /api/admin/validate` → stats `{totalResources:1822, totalCategories:9}` — matches Categories Manager's 9. |
| BUG-050 | LOW | Public API full-db scrape no rate limit | FIXED | Public resources API enforces a page-size cap (large `limit` values clamped). API suite "BUG-050 page cap" PASS. |
| BUG-051 | LOW | Inconsistent 401 envelopes | FIXED | 401s share one envelope shape across auth-guarded endpoints. API suite "BUG-051 401 envelope" PASS. |
| BUG-052 | LOW | Streak 2d beside 0 viewed | FIXED | Streak stat carries an explanatory hint ("Consecutive days signed in") so 2d-streak/0-viewed reads coherently. Auth suite "BUG-052 streak hint present" PASS. |
| BUG-053 | LOW | Orphan empty sub-subcat in sitemap | FIXED + PROD-FOLLOWUP | Sitemap generation excludes empty taxonomy nodes. API suite "BUG-053 sitemap excludes empty nodes" PASS. Prod follow-up: delete the empty "other-encoders" node via admin API after republish (rename-then-delete per prod guard). |
| BUG-054 | LOW | 'Showing 1 of 1 resources' grammar | FIXED | Singular count line ("1 resource") when N=1. Desktop suite "BUG-054 singular count line" PASS. |
| BUG-055 | LOW | General bucket unselectable in dropdown | FIXED | "General (no subcategory)" is a selectable option and drives `view=general`. Desktop suite "BUG-055 General bucket selectable" PASS. |

## Tally

- FIXED (code): 38
- FIXED (DATA, journaled + prod-followup): 8 (BUG-021/039/040/041/043/045/046/047)
- FIXED + PROD-FOLLOWUP (taxonomy): 1 (BUG-053)
- FIXED-PRIOR: 1 (BUG-002, Run13)
- DECLINED: 2 (BUG-031, BUG-032 — documented security tradeoffs, consistent with Run10/12/13)
- BY-DESIGN (partial): BUG-048's `//` eyebrow prefix (jargon itself fixed); BUG-012's category-page semantic button (listing link fixed)
- Total: 55/55 triaged, 0 skipped.

## Prod follow-ups after republish

1. Rerun `scripts/run14-data-fixes.ts` against prod (BUG-021/039/040/041/043/045/046/047) and journal.
2. Delete the empty "other-encoders" sub-subcategory on prod (BUG-053) via admin API (rename-then-delete).
