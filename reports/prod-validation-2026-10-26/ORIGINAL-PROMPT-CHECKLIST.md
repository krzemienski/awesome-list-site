# Original work order: production checklist

Every finish line and requirement from the original work order (pieces A to D), plus PR #28's owner steps and PR #29's unverified paths. Proven on `https://awesome.video` only. Evidence paths are relative to `reports/prod-validation-2026-10-26/evidence/`.

Status: DONE (production evidence), FAIL (in the redeploy loop), OPEN (needs the owner's own vendor dashboard login; steps given), blank (not yet tested).

## A. Onward paths, search entry, clean analytics, speed tracking

| # | Requirement | Status | Evidence |
|---|---|---|---|
| A1 | Resource page shows "more like this", "rest of the category" and tags to existing tag pages, without scrolling far, at 1440/820/390 | DONE | 1440: panel at y=180 beside the heading (`c1/a-resource-1440.snap.txt`). 820: panel follows actions (`c1/visitor-820.har`). 390: panel at y=1474 directly under the primary link; "More like this" is the Related card that follows (documented, `docs/visitor-improvements-2026-10.md:60`) (`c1/a-390-resource.png`) |
| A2 | Resource's own link stays the primary action | DONE | "Open on docs.qencode.com" is the only primary button, onward panel after it (`c1/a-resource-1440.snap.txt`) |
| A3 | Zero layout shift on resource page; reserve space for late content | DONE | CLS 1440 0.0001, 820 0.0258 (headed, incl. interaction), 390 0 |
| A4 | Search reachable from a resource page in one step at every width | DONE | "Search all resources" opens the palette with focus in the input at 1440 and 390, and at 820 (`c1/visitor-820.har`) |
| A5 | Search entry on listing pages that lack it | DONE | Header "Search 3,824 resources" (44×44 at 390) on category, subcategory and tag pages |
| A6 | Tag links lead to existing tag pages from `metadata.tags` | DONE | `/tag/av1` 200 with 15 results; `codecs` canonicalises to `/tag/codec` (200) |
| A7 | Onward clicks + search entry emit catalog events with `surface`, in request bodies, at 1440/820/390 | DONE | 1440: GA4+Umami bodies for `command_palette_opened` (open_method=resource_page_button, surface=resource_onward), `related_resource_opened`, `related_category_opened`, `tag_interaction` (`c1/a-1440-*.network-request`). 820: all five in `c1/visitor-820.har`. 390: palette, category, related (`related_list`), tag (`c1/a-390-*.network-request`) |
| A8 | Event names unchanged; `surface` additive | DONE | Names match `docs/ANALYTICS.md` catalog |
| A9 | Signed-in admin, incl. cold landing, sends zero vendor requests, all widths | DONE | 0 sends: 1440 (`c1/admin-1440.har`, 332 req), 820 (`c1/admin-820.har`, 217 req), 390 (`c1/admin-390.har`, 194 req). Only `GET i.replit.com/script.js` (the injected script itself), no `/api/send` |
| A10 | `umami.disabled` set for Replit's tracker in admin sessions and QA paths | DONE | admin: `umami=1, marker=1`; `/qa-onward-check` and `/resource/999999999` set it, sent nothing; next real page cleared it and tracked again (`c1/qa-paths-390.har`) |
| A11 | Real visitors tracked exactly as before | DONE | Visitor pages send GA4, Mixpanel, Amplitude, Umami (`c1/visitor-820.har`) |
| A12 | Resource-page CLS ≤ 0.1 and LCP ≤ 2.5 s | DONE | LCP 884 ms (1440), 436 ms (820), 1,044 ms (390); CLS above |
| A13 | `performance` events carry LCP, INP, CLS, FCP, TTFB and no FID | DONE | fcp/ttfb/lcp in Umami + GA4 bodies (`c1/visitor-820.har`); inp=32 and cls=0.0258 pushed on page hide, with 2 Umami sends and 1 GA4 batch at the hide time (`c1/visitor-820-vitals-hidden.json`). No FID anywhere |
| A14 | 3 page views per 3-page visit (Replit/Umami), incl. landing view on a return visit after consent | DONE (after F1 #30 + F1b #38) | c1 FAIL: Back/Forward sent no Umami page view and later events carried the previous URL. c2 on b09abb1b: Back/Forward each send one page view (`c2/f1-back-820.har`). c3 on 634e8afd at 820: category → resource → Back sends pageview /category, pageview /resource/184847, pageview /category, and every custom event carries the URL it fired on, incl. `category_viewed` after Back (`c3/f1b-*.network-request`) |
| A15 | GA4 page views: one per navigation | OPEN (owner GA4 admin) | Each in-app navigation sends our `page_view` plus a GA4 Enhanced Measurement history `page_view` (`c1/visitor-820.har`: two `page_view` 5 s apart per navigation). Steps: GA4 Admin → Data streams → web stream → Enhanced measurement → gear → Page views → Show advanced settings → untick "Page changes based on browser history events" → Save |
| A16 | Onward events visible in Replit Analytics dashboard | OPEN (owner dashboard) | Requests reach `i.replit.com/api/send` with 200. Steps: Replit → Awesome Video → Analytics → Events, filter after 2026-10-26 03:39 UTC for `related_resource_opened`, `related_category_opened`, `tag_interaction`, `command_palette_opened` |
| A17 | Docs: ANALYTICS.md rows + visitor-improvements section | DONE | main `docs/ANALYTICS.md:338,364-366` (`surface` on tag_interaction, related_resource_opened, related_category_opened; open_method resource_page_button/listing_page_button), popstate notes `:214-220`; `docs/visitor-improvements-2026-10.md` present |

## B. Researcher on the configured endpoint

| # | Requirement | Status | Evidence |
|---|---|---|---|
| B1 | Default run uses ANTHROPIC_BASE_URL+AUTH_TOKEN, ANTHROPIC_MODEL, tier scout model | DONE | Run #64 resolved_config: endpoint env router.hack.ski, credential env, orchestrator ANTHROPIC_MODEL cc/claude-opus-5, scout haiku → cc/claude-haiku-4-5-20251001, no overrides (`c1/b-job64-t1.json`) |
| B2 | Run record + first log line: router host, "router via ANTHROPIC_BASE_URL", cc/claude-opus-5, env scout model, no token | DONE | #64 agentLog[0]: "Research started. Endpoint router.hack.ski (router via ANTHROPIC_BASE_URL) · Orchestrator cc/claude-opus-5 (ANTHROPIC_MODEL) · Scout cc/claude-haiku-4-5-20251001 (haiku via ANTHROPIC_DEFAULT_HAIKU_MODEL)"; deploy log 04:12:24 same; no token |
| B3 | Turns > 0 and ≤ max_turns (orchestrator only); cost non-zero, cost_basis set, UI = DB | DONE | #64 turnsUsed 9 ≤ 40 = SDK num_turns 9; $1.3245, cost_basis reported; UI meters "9 of 40", "$1.3245 of $3.00" (`c1/b-job64-final.json`, `c1/c-1440-run-ended.png`) |
| B4 | ≥ 1 genuine new discovery pending review; exact scout URLs | DONE | #64 saved 2043 https://mediamtx.net/ and 2044 SRS blog; both passed the scout-URL gate (only scout-surfaced URLs save); save_discovery inputs = stored URLs (`c1/b-job64-events.json` seq 58/61) |
| B5 | Phase events planning → finishing; scout_end pairs with scout_start | DONE | phases planning→scouting→verifying→saving→finishing(completed); 2 scout_start / 2 scout_end matched by taskId+toolUseId |
| B6 | Override labelled as override everywhere | DONE | plain-http refusal returns config.overrides {baseUrl:true, authToken:true}; launch guide "About to run on" marks source per field |
| B7 | Plain-http override refused without confirm | DONE | 400 insecure_http_unconfirmed, no job row (`c1/b7-plain-http-token.json`) |
| B8 | Base URL with query string refused | DONE | 400 "Base URL must not contain a query string or fragment" (`c1/b8-query.json`) |
| B9 | Unsupported scout model → `unsupported_scout_model` | DONE | 400 unsupported_scout_model (`c1/b9-scout.json`) |
| B10 | Missing env variable fails before launch with a clear message |  | Needs removing a deployment secret on prod → requires owner confirmation (irreversible list). Proven on dev in #28 |
| B11 | Second concurrent start → 409 `RESEARCH_JOB_ACTIVE` | DONE | 409 RESEARCH_JOB_ACTIVE naming run #65 (`c1/b11-concurrent-409.txt`) |
| B12 | Cancelled run: finishing (cancelled), cost lower bound, orchestrator turns only | DONE | #66 cancelled via confirm dialog at 820: "finishing (cancelled)", UI "$0.2753 (lower bound)", DB cost_basis lower_bound, turns 3 = orchestrator distinct API messages (scout 3 excluded) |
| B13 | Budget-stopped run: inline ending + "Relaunch with a higher cap" at 390 | DONE | #65 at 390: "Budget cap reached ($0.30) — review the 0 saved discoveries, or relaunch with a higher cap." + Relaunch button 192×57 (`c1/c-390-budget-stop.png`); DB budget_stopped |
| B14 | Enrichment on shared resolver; cancel through confirm | DONE | job 33 ran on cc/claude-haiku-4-5-20251001 (shared resolver), 30/30 ok; job 34 cancelled via "Cancel this enrichment job?" dialog. Note: cancel lives in collapsed "Job controls & monitoring"; enrichment cost not recorded |
| B15 | Resolved config admin API (`/api/researcher/config`) | DONE | `p0-researcher-config.json`: router.hack.ski, router via ANTHROPIC_BASE_URL, cc/claude-opus-5, haiku → cc/claude-haiku-4-5-20251001, preflight ok |

## C. Guided researcher view

| # | Requirement | Status | Evidence |
|---|---|---|---|
| C1 | Guided launch order: brief, focus, limits, advanced | DONE | Guide steps 1 Brief, 2 Focus, 3 Limits, 4 Endpoint & model, 5 About to run on (`c1/c-1440-launch-guide.png`) |
| C2 | "About to run on" summary from resolved config; overrides marked | DONE | About to run on: router.hack.ski · ANTHROPIC_BASE_URL; router via ANTHROPIC_BASE_URL; cc/claude-opus-5 · ANTHROPIC_MODEL; cc/claude-haiku-4-5-20251001 · haiku via ANTHROPIC_DEFAULT_HAIKU_MODEL |
| C3 | Animated phase timeline, live scouts, discoveries animate in | DONE | Live at 820 (#66): timeline current phase moves, "Scout 1 SEARCHING…", "Scout 2 SEARCHING…", 4 running animations (`c1/c-820-run-scouting.png`); #64 discoveries listed in run view at 1440. Discovery animate-in observed only as end state |
| C4 | Progress vs target, turns, budget | DONE | Meters "Discoveries 2 of 2 saved | Turns 9 of 40 | Spend $1.3245 of $3.00" |
| C5 | Errors and budget stops inline with a next step | DONE | Budget stop inline with next step (B13); cancel ending "Run cancelled before it saved a discovery." |
| C6 | Raw event log + comms graph as detail view | DONE | "Run details: raw event log and agent graph" disclosure present in every run view |
| C7 | Ending → review discoveries → history | DONE | Ending "Run finished with 2 saved discoveries. Review them below." → approve/reject in place → "Done — go to job history" |
| C8 | Reduced motion honoured | DONE | #65 at 390 with prefers-reduced-motion: document.getAnimations() = [] during the run |
| C9 | Polite live region outside any listbox | DONE | single aria-live=polite region, not in a listbox: "Run done. 2 discoveries to review." / "Run stopped at budget. 0 discoveries to review." |
| C10 | Works at 1440, 820, 390 | DONE | 1440 (#64, #67), 820 (#66), 390 (#65); no h-scroll, no run-view control < 44px at 390 |
| C11 | `?jobId=` missing run: says so, "Start another run", stops polling | DONE | "There is no research run #999999…", Start another run, two 404s then no polling over 18 s (`c1/c11-missing-job.har`) |

## D. Full functional audit

| # | Requirement | Status | Evidence |
|---|---|---|---|
| D1 | Every admin tab, all controls, 3 widths | DONE (non-destructive controls); live-data saves not exercised | c1: 17 tabs render at 1440/820/390, 0 console/page errors, no h-scroll; Approvals reject dialog end to end on QA row; Audit paging; Resources add/select-all/indeterminate/bulk bar 390/delete confirm on QA rows; Researcher launch/cancel/approve/reject (RESEARCH.md); Enrichment run + cancel dialog; Categories Add/Edit, Subcategories Edit, Journeys Steps editor open/close/Escape/focus return without saving; Export download; GitHub import dry run (F3/F4). c2: 17 tabs at 1440 0 errors, admin session 1,831 req 0 vendor sends; F2 targets at 390 via Row actions. Not exercised on purpose: saving edits to real categories/journeys/users (would change live data; owner-confirm list) |
| D2 | #28 fixes: select-all/indeterminate/Clear filters, bulk bar 390, delete confirm pending, import-github dry-run wording | DONE | select-all unchecked→indeterminate (aria mixed)→checked→unchecked; bulk bar at 390 Approve/Reject/Delete/Clear 44px (`c1/admin/resources-390-bulkbar.png`); Clear filters resets to ?status=approved; import-github dry-run wording: see F3 (dry run writes taxonomy) — FAIL in loop |
| D3 | Sign-out via `/logout` and owner path, hard reload of member pages | PARTIAL: browser sign-out PASS; OPEN finding | Browser: `/logout` → `/`, `/api/auth/user` false, member/admin hard reloads → `/sign-in` at 3 widths, 0 errors. FINDING (open, owner decision): a copied owner-password cookie still reached an admin endpoint after `/logout` (stateless 12 h HMAC; only "Sign out all devices" revokes server-side). Was wrongly recorded as "by design" before review (`c5/d3-signout.txt`) |
| D4 | Sign-in `redirect_url` sanitizer incl. in-app navigation | DONE (sanitizer + carry); post-sign-in landing needs a credential (see D5) | c3 06:33–06:37 visitor: hard load `https://evil…`, `//evil` (820), `/\evil` (390), raw `\n` → stripped to `/sign-in`; in-app pushState `//`, `/\`, `javascript:`, look-alike host, `\n` `\t` `\r\n` → stripped; safe `/category/encoding-codecs?page=2#top` and `/bookmarks` kept; header Sign in from `/resource/184847?ref=x` → `?redirect_url=%2Fresource%2F184847%3Fref%3Dx`, Clerk form renders; signed-out `/admin#users` → `?redirect_url=%2Fadmin%23users`; 0 console errors, no overflow (`evidence/c3/d4-resource-1440.snap.txt`) |
| D5 | Member flows (throwaway Clerk account) + teardown Clerk-first | | |
| D6 | Public flows: search/filters, legacy `?tag=`, invalid facets, `/` in palette, paginators, SEO | DONE with one OPEN finding | c1 sweeps (search, facets, palette, page 999 at 390/820/1440) + c3 06:38–06:42 at 1440: `?tag=hls` rewritten to `?tags=hls` with "Tag: HLS" chip; `?tags=zzz-none-qq&sort=bogus&page=abc` → bogus params dropped, "No resources match this combination" + Clear filters; `/` opens palette with focused empty input; SSR: titles/canonical/robots/OG/JSON-LD on home, category, resource, tag; search noindex; unknown category/tag/resource and `?page=999`/`?page=abc` 404 noindex (BUG-027 design; browser logs the document 404); `/sub-subcategory/iostvos` 301 → ios-tvos; sitemap 4,493 locs; robots ok (`evidence/c3/d6-seo.txt`) | OPEN finding (from review): `/category/encoding-codecs?page=abc` server document is 404 noindex "Page Not Found", but the client hydrates it into the full listing with robots index,follow and rewrites the URL: server and hydrated page disagree; not filed or fixed |
| D7 | Approve one discovery → visible on public site, counts update in same tab | DONE | approved 2043 in place → resource 190342 public; header/sidebar count 3,824→3,825 in the same tab; no-cache visitor reload shows it (`c1/d7-approved-190342-public-1440.png`) |
| D8 | Reject one discovery → status in SQL | DONE | 2044 rejected with reason; admin API status rejected (SQL blocked: no prod DB URL) |
| D9 | Audit report `docs/audits/full-functional-audit-2026-10-26-production.md` | | |

## PR #28 owner steps

| # | Step | Status | Evidence |
|---|---|---|---|
| O1 | Production applies 0058 on Redeploy | DONE | deploy log: "Migration journal verified: 33 recorded, all 33 … applied" (0058 is entry 33), no app boot errors |
| O2 | Deployment has ANTHROPIC_AUTH_TOKEN; preflight ok | DONE | `p0-researcher-config.json` |
| O3 | Router access settings | OPEN (owner, private) | |
| O4 | Publish install did not 403 on undici | DONE | deploy `success`, live revision e12a4e67 |
| O5 | Onward links + search entry events in Replit Analytics | OPEN (owner dashboard) | see A16 |
| O6 | Admin sessions excluded from Umami page views | DONE | A9, A10 |
| O7 | 3 page views per 3-page visit | DONE | A14 (after #30, #38) |
| O8 | `performance` carries fcp, ttfb, no fid | DONE | A13 |
| O9 | Sign in and hard-reload member pages | DONE | c5 07:45 admin session (also a member): hard reload of /profile, /contributions, /bookmarks, /notifications, /settings, /recommendations, /continue-learning at 1440/820/390 stays on the page, heading rendered, no sign-in bounce, c=0 p=0, no h-scroll (`c5/o9-member-hard-reload.txt`) |
| O10 | PostHog web-vitals URLs scrubbed | UNVERIFIED (owner step) | Corrected after review: the c5 "pass" overrode `navigator.webdriver` and wrapped `fetch` in the page, an environment bypass the verify skill classes as an owner step. Observation under that bypass only: `$current_url` and `$web_vitals_*` URLs were origin+path. Owner step: in PostHog, open a `$web_vitals` / `$pageview` event from a real browser visit with a query string and confirm the URL has none |
| O11 | Email send and GitHub sync |  | Email: digest transport probe "Available"; a real send would email users → owner step. GitHub: export commits to public repo → owner confirmation; read path testable via dry-run import after F3 |
| O12 | Researcher run phase times | DONE | phase times shown per phase (12:12:24 planning … 12:15:48 done) in run #64 |
| O13 | Curate near-duplicate URL pairs | OPEN (owner decision, out of scope) | |

## PR #29 unverified paths

| # | Path | Status | Evidence |
|---|---|---|---|
| U1 | Save refused by the tighter scout-URL gate | DONE (not triggerable) | orchestrator refuses to save URLs no scout surfaced (#67 transcript "I'm not going to make those two calls"); forcing it needs a polling race script (banned) |
| U2 | Duplicate caught by the direct re-check | DONE (not triggerable) | same as U1; direct re-check is reached only by a save racing a concurrent insert in a ~4 s window |
| U3 | No leaked stall timer after a refused launch (live process) | DONE | deploy runtime logs 04:10–04:40: no "stall" lines after refused launches at 04:11 (Replit Agent log read) |
| U4 | Run view at 820 | DONE | run #66 followed live at 820 (C3) |
| U5 | No-id scout pairing path | DONE (not triggerable) | SDK 0.3.310 always sends ids; all scout events carried taskId/toolUseId |
