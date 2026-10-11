# Audit-final backlog

Lifecycle: `OPEN` → `REPRODUCED` → `FIXED` → `CONFIRMED`; also `NOT-REPRODUCED` (needs reviewer confirmation), `REJECTED`, `DECIDED`, `BLOCKED-PAID`.
Verification is by real browser use / curl only (no proof packets or gates since 2026-10-11). Rows marked *(discovered)* came from unexpected items in proof frames.

## WS1 Recommendations and onboarding
| ID | Item | Status | Packet |
|---|---|---|---|
| R-01 | Issue #20: Skill level / Time commitment controls jump the page instead of opening | NOT-REPRODUCED — CONFIRMED (review-r01, ab6da9f9) | [R-01](proof/R-01/packet.md) |
| R-02 | Every Select / Popover / DropdownMenu checked for the same scroll jump | NOT-REPRODUCED — every aria-haspopup/combobox trigger on public pages, member pages (bookmarks, contributions, settings, profile) and all 15 admin tabs at 1280 and 375 opens in place with a real mouse click (jump 0, focus returns on Escape). The only jump seen (/advanced sort → page top) is a Playwright artifact: `locator.click()` during an in-flight smooth scroll; real mouse click, wheel-then-click and keyboard Enter keep position | |
| R-08 | *(discovered in R-02)* Member recommendations could list one resource twice (AI list repeats an id → React duplicate-key warning on /profile) | FIXED — final list (and cold-start list) deduped by resource id before caching; /profile POST returned 6 unique, no key warning | |
| R-03 | Recommendations guest + member: refresh, feedback, Undo/Restore, empty, offline | NOT-REPRODUCED — browser: guest gets onboarding + popular list (feedback is member-only by design); member Hide removes the card with an Undo toast (Undo brings it back), Hide → Restore persists across reload; Not for me / Already know / Helpful each press and clear with one PUT apiece (server ends empty); hiding every card shows "No unseen recommendations right now" + Try again with the Hidden (7) section; offline Refresh shows "Waiting for connection…" and keeps the list | |
| R-04 | Onboarding progress survives reload and sign-in; dismissal sticks | NOT-REPRODUCED — browser, fresh members: Continue saves in_progress + step server-side; an unsaved step-2 pick survives reload; a new browser sign-in shows "Continue setup" → step 2 with step-1 answer kept; guest /onboarding?step=3 → sign-in → back on step 3; "Save and browse later" and home "Not now" both set dismissed and the invite stays gone after reload and a fresh sign-in (375 too) | |
| R-05 | Resetting learning preferences changes the next recommendations | NOT-REPRODUCED — browser, fresh member: Settings save (beginner / Players & Clients / build apps / hands-on) → all 10 picks are players (Kodi, FreeTube, DKVideoPlayer…); Reset → confirm dialog → toast, prefs null, panel switches to "Using your account activity" and the next list is a different general set (0 overlap). Missing format blocks save with an inline error (correct) | |
| R-09 | *(discovered in R-05)* Recommendation card rendered a duplicate tag when subcategory = sub-subcategory ("Web Players") → React duplicate-key warning | FIXED — card de-dupes its tags; Eyevinn WebRTC Player shows one #Web Players, no warning | |
| R-10 | *(discovered in R-05)* First-load failure (e.g. AI rate limit 429) was titled "Recommendations couldn’t be refreshed" although nothing was refreshed | FIXED — the no-results error alert now reads "Recommendations couldn’t load" (message + Try again unchanged) | |
| R-06 | *(discovered in R-01)* Member "saved learning profile" chips omit available time although the copy says it is used | CONFIRMED | [R-06](proof/R-06/packet.md) |
| R-07 | *(discovered by review-r01)* Onboarding completion button "See personalized recommendations" clips its label at 375 | CONFIRMED | [R-07](proof/R-07/packet.md) |

## WS2 Catalog, navigation, search
| ID | Item | Status | Packet |
|---|---|---|---|
| N-01 | Issue #18: nav / overview / category header / listing totals disagree | NOT-REPRODUCED — CONFIRMED (review-n01, ab6da9f9 dev + 26450e08 prod) | [N-01](proof/N-01/packet.md) |
| N-02 | Count agreement for every subcategory and sub-subcategory | OPEN | |
| N-03 | Home "Featured 0" → hide when empty (decision 3) | FIXED — browser-checked index+curated at 1280/375 | |
| N-04 | Search facet counts vs results under filters, sort, pagination | OPEN | |
| N-05 | Tag landing pages: counts, pagination, empty tags | OPEN | |
| N-06 | Sub-subcategory pages, breadcrumbs, empty nodes | OPEN | |
| N-07 | Advanced/Explorer filters survive URL reload | OPEN | |
| N-08 | ⌘K palette keyboard flow and focus return in every system | OPEN | |
| N-09 | Production canonical on encoded taxonomy URLs | FIXED — cause: dotted tags (video.js, node.js) were singularised; canonical/robots match per page kind on dev and prod | |
| N-10 | Pagination, back/forward, scroll restoration | OPEN | |
| N-11 | *(carried)* url-params-audit angle-bracket case: real regression or scrubber behaviour | DECIDED — scrubber behaviour, not a regression: markup-shaped q/tags (incl. double-encoded) are stripped with a visible "Part of the link … was ignored" notice on /search and home; `a < b > c` and normal queries are kept. The earlier home failures were a dev-server crash (fixed: a query on "/" made Vite watch the whole filesystem → OOM) | |
| N-12 | *(discovered in N-01)* Category page subcategory cards sum below the category total; resources filed directly under the category have no card (Players & Clients 122 vs 239 dev, 330 vs 447 prod) | CONFIRMED | [N-12](proof/N-12/packet.md) |
| N-13 | *(discovered in N-01)* Off-origin 429 = GitHub OG thumbnail; a failed thumbnail left an empty/blurred 8rem frame on cards (and detail) | FIXED in code; AFTER capture waits for a real failure | [N-13](proof/N-13/packet.md) |
| N-14 | *(discovered in N-12)* Sidebar child rows under a category sum below the category badge (direct resources have no row; an "All in …" row exists) | CONFIRMED | [N-14](proof/N-14/packet.md) |
| N-15 | *(discovered in N-14)* Subcategory page narrowed by `?filter=general` shows no visible sign of the filter (badge 67, 10 listed, count heading sr-only, no chip) | CONFIRMED | [N-15](proof/N-15/packet.md) |

## WS3 Member features
| ID | Item | Status | Packet |
|---|---|---|---|
| U-01 | Resource detail actions (bookmark+note, favorite, related, suggest edit, share, outbound, dead-link report) | OPEN | |
| U-02 | Bookmarks: sort, filter, notes, collections, privacy, public view (two users) | OPEN | |
| U-03 | Guest bookmarks merge on sign-in | OPEN | |
| U-04 | Journeys start/resume/complete/undo; step resource field shape | OPEN | |
| U-05 | Submit: validation, 409 inline, success, guest rate limit | OPEN | |
| U-06 | Contributions: every status, withdraw, View status | OPEN | |
| U-07 | Continue Learning with and without data | OPEN | |
| U-08 | Notifications: read/unread, deep links, empty | OPEN | |
| U-09 | Contact form reaches the admin inbox | OPEN | |
| U-10 | Malformed IDs render the designed not-found page | OPEN | |

## WS4 Account, settings, consent
| ID | Item | Status | Packet |
|---|---|---|---|
| A-01 | Sign-in/up/out, sign-out everywhere, deep return to admin hash tabs | OPEN | |
| A-02 | Deletion request create/withdraw; API keys create/copy/revoke (200 → 401) | OPEN | |
| A-03 | Theme persistence for every system/accent; sync failure shows Retry | OPEN | |
| A-04 | Consent: no analytics before consent / after denial; starts after accept | OPEN | |
| A-05 | Digest settings, unsubscribe page, quick actions | OPEN | |
| A-06 | Production QA identity documented in RELEASE.md | OPEN | |

## WS5 Admin moderation and catalog
| ID | Item | Status | Packet |
|---|---|---|---|
| M-01 | Approvals: approve/reject/bulk/description gate → public right away | OPEN | |
| M-02 | Edits queue: diff, apply, reject with reason; Analyze stops at confirm (paid) | OPEN | |
| M-03 | Resource manager CRUD, bulk, filters, search, pagination, sanitization | OPEN | |
| M-04 | Taxonomy managers create/rename/move/delete with nav counts | OPEN | |
| M-05 | Users: role change; delete scratch users only | OPEN | |
| M-06 | Audit tab fixed height (Actor, PII masking, status vocabulary, pagination) | FIXED — 25 per page, one-line rows (56px) in every system at 375/768/1440; target truncates with title + detail dialog; table scrolls inside its region at 375 | |
| M-07 | Journey step editor | OPEN | |
| M-08 | Overview tiles match SQL | OPEN | |
| M-09 | Audit insert in the write transaction; definitive error copy | FIXED — admin writes (taxonomy CRUD, kind, featured, resource create/update incl. auto-created sub-subcategory, export queue, tag canonicalize) run in one transaction with their audit row; cache invalidates after commit. Held ACCESS EXCLUSIVE lock on resource_audit_log: category rename and featured toggle → 503, dialog reads "Nothing was changed. Please try again.", nothing persisted; unlocked rename/delete update the public catalog immediately. Bulk/job/undo copy stays uncertain | |
| M-10 | Admin at 375/768 in all 5 systems, no horizontal overflow | NOT-REPRODUCED — all 15 admin tabs (activation checked) × 5 systems × 375/768: document scrollWidth = clientWidth; wide tables scroll inside their own region | |

## WS6 Admin operations
| ID | Item | Status | Packet |
|---|---|---|---|
| O-01 | Exports and export history; row counts match SQL | OPEN | |
| O-02 | Database backup create/list/restore into scratch | OPEN | |
| O-03 | Link health scan, cancel, failure reasons, trend | OPEN | |
| O-04 | GitHub configure/pull/Sync now on a private scratch repo | OPEN | |
| O-05 | Digest queue health and one real dev dispatch | OPEN | |
| O-06 | Batch enrichment (paid): up to confirm | OPEN | |
| O-07 | Researcher subtitle wrap at 375 and Terminal 768 (launch is paid) | FIXED — researcher subtitle one line at 375 and Terminal 768; canonical table headers no longer wrap | |
| O-08 | Agent event log and comms graph | OPEN | |
| O-09 | Contact inbox read/archive/error state | OPEN | |
| O-10 | Database tab seed / RESEED / refusal on scratch DB | OPEN | |

## WS7 Design
| ID | Item | Status | Packet |
|---|---|---|---|
| D-01 | admin.audit vs reference at every width and system | FIXED — audit columns/subtitle/single-line cells match reference; same panel height across widths | |
| D-02 | admin.research at 375 and Terminal 768 | FIXED — research/researcher at 375 and Terminal 768/1024: no overflow, one-line headers | |
| D-03 | Terminal admin rows at 768/1024 | FIXED — cause: wider mono font wrapped resource titles to 4 lines and categories to 2; category one line, title clamped to 2 → 73px rows in Terminal and Editorial at 375–1440 | |
| D-04 | Header deviations kept (decision 4): ledger row | OPEN | |
| D-05 | Submit actions at 375 stack full width, 44px | FIXED — /submit at 375 in all 5 systems: Cancel above Submit, full width, 44px; 768 unchanged | |
| D-06 | Brutalist overview category-bar track vs AA | DECIDED — track uses --surface-3 (reference --border is near-opaque in Brutalist and hides the bar); bar vs track ≥15:1 in all 5 systems | |
| D-07 | app.system.error reachable by a real offline corpus failure | FIXED — cause: ErrorPage was a lazy chunk and the corpus query paused offline (networkMode online) so it never errored; now bundled with the shell + networkMode always. Browser offline → /advanced renders the error page in editorial 375/1440, terminal 375/768, geist 1280, brutalist 375, swiss 768, no overflow; online /advanced unchanged | |
| D-08 | Full visual sweep vs frozen reference | OPEN | |
| D-09 | 44px touch targets at ≤1024 | FIXED — pagination, card actions, recommendation feedback, "+N more", home index rows, logo link, footer and related-tag links ≥44px at ≤1024; frozen chips/pills keep their sizes (≥24px AA) by decision | |
| D-10 | Category glyph fallback on WebKit / Android emulation | OPEN | |
| D-11 | Loading/empty/error states consistent | OPEN | |
| D-12 | *(discovered in N-14)* Mobile drawer close button covers the counts of rows scrolled under it (375) | CONFIRMED | [D-12](proof/D-12/packet.md) |

## WS8 Accessibility and performance
| ID | Item | Status | Packet |
|---|---|---|---|
| X-01 | Lighthouse + axe on every route with dialogs/menus open | OPEN | |
| X-02 | Keyboard-only walk of core journeys | OPEN | |
| X-03 | Lighthouse mobile on home/category/resource (≥90, LCP <2.5 s) | OPEN | |
| X-04 | Core journeys in Firefox and WebKit | OPEN | |
| X-05 | Print preview for resource, journey, bookmarks | OPEN | |

## WS9 Platform, SEO, security
| ID | Item | Status | Packet |
|---|---|---|---|
| S-01 | Zero hydration warnings on SSR routes | FIXED — 0 hydration warnings observed in browser console on SSR routes | |
| S-02 | Sitemap, robots, OG, canonicals per page kind | FIXED — 25 sampled sitemap URLs 200 with self-canonical; OG and robots.txt correct; dotted-tag fix shared with N-09 | |
| S-03 | Developer API keys, rate limits, OpenAPI Try-it-out | OPEN | |
| S-04 | Security headers; secrets in committed config | OPEN | |
| S-05 | npm audit 0 high / 0 critical | FIXED — 0 high/0 critical (4 moderate inside drizzle-kit, fix is a downgrade) | |

## WS10 Hygiene
| ID | Item | Status | Packet |
|---|---|---|---|
| C-01 | Consolidate ds duplicates and middleware/middlewares split | FIXED — clerkProxyMiddleware moved into server/middleware (single dir); build passes; sign-in + home load clean. DECIDED: awesome-list-site-ds and -20260929 are distinct frozen references (09-10 vs 09-29, 10 files differ), nothing imports them — kept untouched | |
| C-02 | Remove unused dependencies | FIXED — 16 unused packages removed; app browser-checked | |
| C-03 | Stale PRs #19/#21/#24/#25 (needs owner confirmation) | OPEN | |
| C-04 | Close #18 and #20 with packet links (needs owner confirmation) | OPEN | |

## WS11 Release
| ID | Item | Status | Packet |
|---|---|---|---|
| P-01 | Release candidate commit with every row confirmed | OPEN | |
| P-02 | Post-publish prod revision + reviewer read-only walkthrough | OPEN | |
| P-03 | Net-zero signed-in prod walkthrough with the A-06 identity | OPEN | |
