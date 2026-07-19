# Run21 findings table — R4-001..R4-081 (Run4 black-box audit, fixed July 19, 2026)

Scope: all 81 findings from the Run4 audit mission file remediated against the dev system (prod DB is not agent-writable — data fixes applied to dev via the live admin API and journaled for prod in `scripts/run21-data-fixes-prod.ts` + `scripts/run21-link-fixes-prod.ts`, both idempotent, same code path). Iron Rule throughout: every verdict below is backed by a live probe (curl JSON, Playwright screenshot, or corpus sweep output) in this directory. Server-behavior findings were re-run at the final gate (July 19) on top of the per-task probes.

Statuses: **fixed** (code and/or data landed, live-proven) · **fixed (data)** (corpus fix applied on dev, prod journaled) · **partial/by-design** (deliberate scope decision, rationale given) · **invalid** (false positive, evidence given) · **platform** (not addressable app-side, documented).

| # | ID | Sev | Title | Verdict | Evidence |
|---|----|-----|-------|---------|----------|
| 1 | R4-001 | CRIT | afterglow links gambling-spam domain | fixed (data + class) — 186434 → github.com/moay/afterglow; Link Health gained domain-takeover/spam-marker detection | `link-fixes-dev.json` (+`-run2` no-op) |
| 2 | R4-002 | HIGH | WinFF → wallpapers.com | fixed (data) — 186537/186590 → github.com/WinFF/winff | `link-fixes-dev.json` |
| 3 | R4-003 | HIGH | OpenQoE domain parking | fixed (data) — 188209/186212 deleted (live GitHub twins 187975/188050 retained) | `link-fixes-dev.json` |
| 4 | R4-004 | HIGH | x266 Wiki TLS mismatch | fixed (data) — wiki.x266.mov rows (188285/188402) repointed | `link-fixes-dev.json` |
| 5 | R4-005 | HIGH | Kurento → Twilio marketing | fixed (data) — 186435/186211 → doc-kurento.readthedocs.io/en/stable/ | `link-fixes-dev.json` |
| 6 | R4-006 | HIGH | mpegif 525 + projekktor 522 | fixed (data) — 185559 → Wikipedia MPEG Industry Forum, dead dup deleted; projekktor → github.com/frankyghost/projekktor | `link-fixes-dev.json` |
| 7 | R4-007 | HIGH | github.imc.re phishing warning | fixed (data) — 185473 → github.com/OpenVisualCloud, 185434 → github.com/vadootvpeer/p2p-cdn-sdk-javascript | `link-fixes-dev.json` |
| 8 | R4-008 | HIGH | Two GitHub destinations 404 | fixed (data) — 187995 → gitlab.com/AOMediaCodec/SVT-AV1, 188108 → github.com/motion-canvas/motion-canvas, 188431 rocute handled | `link-fixes-dev.json` |
| 9 | R4-009 | HIGH | Trailing-slash renders 404 @200 | fixed — `/about/` → 301 `/about` (len>1, query preserved), whole-class in og-middleware redirect layer | final-gate curl (301 re-verified) |
| 10 | R4-010 | HIGH | Hydration doubles head metas | fixed — client dedup of non-helmet head tags after first commit; served page has exactly 1 title + 1 description (2nd `<title>` match is a JS string in a bundled lib, not head) | final-gate curl |
| 11 | R4-011 | HIGH | Approvals actions garbled ≤768px | fixed — shared admin-table ≤768 strategy (contained scroll, actions reachable) | T004 probe (transcript) |
| 12 | R4-012 | HIGH | Pending Edits actions unreachable ≤768px | fixed — same shared table strategy | T004 probe (transcript) |
| 13 | R4-013 | HIGH | Print: solid-black buttons | fixed — @media print overhaul: buttons inverted/hidden, dark-on-white text | `screenshots/print_home.png`, `screenshots/print_advanced.png` |
| 14 | R4-014 | HIGH | ZWSP-only password accepted | fixed — visibleLength ≥8 (strips \u200B-\u200D\uFEFF); register/change/reset paths | `r014.json` (400) |
| 15 | R4-015 | HIGH | Whitespace-only titles accepted | fixed — shared visibleString validator on every write path | `r015.json` (400) |
| 16 | R4-016 | HIGH | Edit endpoints skip validation | fixed — suggest-edit + admin edit mounted on shared validator | `r016a.json`, `r016d.json` (400s) |
| 17 | R4-017 | HIGH | Confirm buttons blown off-viewport | fixed — dialog content max-width clamp + break-all | T004 probe (transcript) |
| 18 | R4-018 | HIGH | Filter from deep page → "Page 101 of 11" | fixed — filter/search change resets to page 1 | `screenshots/r4-018-filter-page-reset.png` |
| 19 | R4-019 | HIGH | Role-change leaks bcrypt hash | fixed — field-whitelist `sanitizeUser` serializer on ALL user-returning send sites | `r019.json` (no password field) |
| 20 | R4-020 | MED | MainConcept comparison 404 | fixed (data) — 187913/186375 → mainconcept.com/codec-comparison-tool | `link-fixes-dev.json` |
| 21 | R4-021 | MED | IEEE Xplore soft-404 | invalid (false positive) — IEEE hard-blocks datacenter IPs; SMPTE ST 2084 doc page verified live via web search + browser-UA probe | T002 probe (transcript) |
| 22 | R4-022 | MED | Four destinations hard-403 | fixed (data) — 403s re-probed with browser headers; genuine blocks repointed, bot-walls retained per link-scan policy | `link-fixes-dev.json`, `sweep-problems.json` |
| 23 | R4-023 | MED | Redirect-drift to generic roots | fixed (data + class) — drifted deep links repointed; Link Health now flags cross-domain redirect-to-root at HTTP 200 | `link-fixes-dev.json` |
| 24 | R4-024 | MED | og:image SVG clips long titles | fixed — og-image long-title auto-fit/ellipsis | T006 probe (transcript) |
| 25 | R4-025 | MED | Titles exceed 60 chars | fixed — word-boundary title budget in BOTH pipelines (shared/seo-templates); home = 59 visible chars | final-gate curl |
| 26 | R4-026 | MED | Meta descriptions exceed 160 | fixed — desc budget both pipelines; home = 143 chars | final-gate curl |
| 27 | R4-027 | MED | JSON-LD breadcrumb skips levels | fixed — full visible trail in BreadcrumbList on /resource/* | T006 probe (transcript) |
| 28 | R4-028 | MED | /index.html stale shell 404-render | fixed — `/index.html` → 301 `/` | final-gate curl |
| 29 | R4-029 | MED | www.awesome.video no DNS | platform — DNS record is a registrar/user action; documented in prod follow-up journal | replit.md journal |
| 30 | R4-030 | MED | og-image mints arbitrary text | fixed — ?path= resolved server-side from stored data; ANY title param → byte-identical default brand image (62,813 B for 3 different inputs) | final-gate curl |
| 31 | R4-031 | MED | Rate limiting never enforces | partial/by-design — Retry-After added to limiters + new limiter on /api/awesome-list (RateLimit-Policy 100;w=60 live); shared-store limiter explicitly DECLINED by user — per-instance limits documented | final-gate curl |
| 32 | R4-032 | MED | API failures render fake-empty | fixed — distinct error + retry states on /search and /advanced | T008 probe (transcript) |
| 33 | R4-033 | MED | 3.1MB catalog blob 2× per page | fixed — all query sites converged on ONE cache key (`awesome-list-data`) + early-fetch-aware fetcher; cold /advanced, /resource/:id, / each fetch exactly 1× | `r033-single-fetch.json` |
| 34 | R4-034 | MED | 65 empty descriptions | fixed (data) — backfilled with factual one-liners + desc now required server-side | `backfill-descriptions.json`, sweep 0 in `data-fixes-dev.json` |
| 35 | R4-035 | MED | [vc_row] shortcode junk (2) | fixed (data) — shortcodes stripped | `data-fixes-dev.json` |
| 36 | R4-036 | MED | Duplicate boilerplate descriptions | fixed (data) — 4 groups / 9 resources rewritten | `data-fixes-dev.json` |
| 37 | R4-037 | MED | 6 mislabeled into FFmpeg bucket | fixed (data) — re-parented to correct sub-subcategories | `data-fixes-dev.json` |
| 38 | R4-038 | MED | Print: raw URLs overlap titles | fixed — a::after href print rule replaced with wrapping block form | `screenshots/print_home.png` |
| 39 | R4-039 | MED | Print: interactive chrome prints | fixed — sidebar/search/sort/consent/toasts hidden in print | `screenshots/print_advanced.png` |
| 40 | R4-040 | MED | /profile Settings clipped 768–812px | fixed — reflow keeps button in-viewport @768 | `screenshots/t008_profile_768.png` (re-probed at gate) |
| 41 | R4-041 | MED | Identical accessible names on rows | fixed — row-context aria-labels on repeated controls | T004 probe (transcript) |
| 42 | R4-042 | MED | Consent covers Sign-in @812×375 | fixed — no CTA occlusion in landscape | `screenshots/t008_consent_812x375.png` |
| 43 | R4-043 | MED | Link Health "healthy!" while running | fixed — job-state-driven UI | `screenshots/r4-043-linkhealth-running.png` |
| 44 | R4-044 | MED | Link Health counters disagree | fixed — counters + problem list derive from same dataset | T004 probe (transcript) |
| 45 | R4-045 | MED | PDF toast promises dialog that never opens | fixed — honest feedback on every export path | T004 probe (transcript) |
| 46 | R4-046 | MED | Profile Settings opens Theme page | fixed — Settings lands /settings hub; validated display-name editor present | gate probe: click lands `/settings` |
| 47 | R4-047 | MED | Description bounds not server-enforced | fixed — min/max on shared validator | `r047a.json`, `r047b.json` (400s) |
| 48 | R4-048 | MED | No URL length limit (100k stored) | fixed — httpUrl max 2048, https-only | `r048.json` (400) |
| 49 | R4-049 | MED | ZWSP display name → invisible | fixed — visibleString on display name | `r049.json` (400) |
| 50 | R4-050 | MED | Name cap 100 vs 50 mismatch | fixed — unified 50-char cap register + editor | `r050.json` |
| 51 | R4-051 | MED | Launch silently disabled <10 chars | fixed — visible hint + short-prompt feedback | `screenshots/r4-051-researcher-hint.png`, `-short-prompt-feedback.png` |
| 52 | R4-052 | MED | Max Turns silently rewrites | fixed — invalid input surfaces message, no silent coercion | `screenshots/r4-052-invalid-turns.png`, `-maxturns-feedback.png` |
| 53 | R4-053 | MED | maxBudgetUsd=0 accepted | fixed — budget must be > 0 server-side (upper cap removed at user request) | `r053.json` (400) |
| 54 | R4-054 | MED | Bulk Approve no confirmation | fixed — confirm dialog with count (sibling bulk actions audited) | `screenshots/r4-054-bulk-approve-confirm.png` |
| 55 | R4-055 | MED | /submit form lost on refresh | fixed — draft persistence + beforeunload guard | `screenshots/t008_submit_draft.png` |
| 56 | R4-056 | MED | Bookmark/Favorite failures silent | fixed (class) — 401 → sign-in toast w/ action, 500 → destructive toast; BookmarkButton AND ResourceDetail inline mutations; aria-disabled kept (no focus destruction) | `screenshots/t008_bookmark_500_v2.png`, `t008_bookmark_401_v2.png`, `t008_favorite_500_v2.png` |
| 57 | R4-057 | MED | Journey toast leaks raw 500 | fixed — humanized error copy, raw-500 stringification scrubbed in mutation onError app-wide | T008 probe (transcript) |
| 58 | R4-058 | LOW | /about missing robots meta | fixed — explicit index,follow robots meta | final-gate curl |
| 59 | R4-059 | LOW | No JSON-LD on 4 pages | fixed — JSON-LD added to /advanced, /submit, /terms, /privacy | T006 probe (transcript) |
| 60 | R4-060 | LOW | PNG touch icons 404 | fixed — apple-touch-icon.png + icon-192/512.png generated and referenced | files in `client/public/`, refs in index.html |
| 61 | R4-061 | LOW | http→https 301 points at :443 origin | platform — redirect emitted by the hosting edge (not app code); origin-form documented; app emits no :443 URLs | replit.md journal |
| 62 | R4-062 | LOW | Case-variant URLs hard-404 | fixed — `/About` → 301 `/about` via case-insensitive route canonicalization | final-gate curl |
| 63 | R4-063 | LOW | og-image 500 on null-byte | fixed — %00 in path → 400; legacy null-byte title → 200 default brand image (no crash path left) | final-gate curl |
| 64 | R4-064 | LOW | Markdown residue in descriptions (8) | fixed (data) — residue cleaned corpus-wide | `data-fixes-dev.json` |
| 65 | R4-065 | LOW | 17 plaintext http:// destinations | partial/by-design — 7 hosts verified 301-to-https and upgraded; remaining hosts per-URL verified https-UNSUPPORTED (403/507/no TLS) and stay http deliberately | `link-fixes-dev.json` (rule comments) |
| 66 | R4-066 | LOW | 3 Wayback snapshot links | by-design — ALL 14 wayback URLs live-source reviewed: 14/14 originals dead or soft-vanished → snapshots retained (repointing would swap working content for dead pages) | `wayback-review.md` |
| 67 | R4-067 | LOW | 2 empty taxonomy buckets reachable | fixed (data) — empty buckets removed (rename-then-delete via admin API, full-chain zero pre-check) | `data-fixes-dev.json` |
| 68 | R4-068 | LOW | Descriptions repeat title verbatim (6) | fixed (data) — case/whitespace-insensitive sweep, suppressed/backfilled | `data-fixes-dev.json` |
| 69 | R4-069 | LOW | 42 descriptions stray whitespace | fixed (data + class) — corpus trimmed + trim-on-write in shared validator | `data-fixes-dev.json` |
| 70 | R4-070 | LOW | Print: orphan trailing pages | fixed — break-inside:avoid on cards/rows | `screenshots/print_advanced.png` |
| 71 | R4-071 | LOW | Consent tab stops 214–215; no Escape | fixed — early tab order + Escape dismiss | T008 probe (transcript) |
| 72 | R4-072 | LOW | /about ~160 chars/line | fixed — prose measure clamped | T008 probe (transcript) |
| 73 | R4-073 | LOW | Focus-ring 1px vs 2px | fixed — unified 2px focus ring | T008 probe (transcript) |
| 74 | R4-074 | LOW | Popular ranks all-zero entries | fixed — zero-data → no ranks in the reachable Popular tab (legacy analytics-dashboard.tsx confirmed unreachable dead code) | `screenshots/t008_popular_zero.png` |
| 75 | R4-075 | LOW | Completed journey says "Continue" | fixed — completed state gets its own CTA label | T008 probe (transcript) |
| 76 | R4-076 | LOW | Userinfo URLs accepted | fixed — httpUrl rejects embedded credentials | `r076.json` (400) |
| 77 | R4-077 | LOW | Name editor keeps stale lastName | fixed — validated display-name editor submits both fields; unified caps (with R4-050) | `r050.json` + T008 probe |
| 78 | R4-078 | LOW | Agent Events dumps raw stderr | fixed — events sanitized/truncated | `screenshots/r4-078-agent-events.png` |
| 79 | R4-079 | LOW | resourceId=0 ignored; offset=-1 clamped | fixed — audit-log params validated → 400 | `r079a.json`, `r079b.json` |
| 80 | R4-080 | LOW | "10/10" counter while disabled | fixed — trim-before-count on reject reason | T004 probe (transcript) |
| 81 | R4-081 | LOW | No cross-tab consistency | fixed — storage-event sync (crossTabSync) for auth/bookmark/favorite mutations incl. ResourceDetail | T008 probe (transcript) |

## Final gate (July 19, 2026)
- tsc clean · migration-drift workflow clean · QA teardown net-zero (`__qa_test*` users/resources/edits/journeys = 0).
- Server-behavior re-runs at gate: R4-009/010/025/026/028/030/031/033/058/062/063 all re-probed live on dev (curl/Playwright, this table's "final-gate" rows).
- P0 smoke: see `p0-smoke.md` in this directory.
- Prod follow-ups (prod DB not agent-writable): after republish run `scripts/run21-data-fixes-prod.ts` + `scripts/run21-link-fixes-prod.ts` (idempotent, live admin API — validated end-to-end against dev via the same code path).
