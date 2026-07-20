# Run23 Completion Table — MASTER-FIX-PROMPT-v2 (July 20, 2026)

Audit: `attached_assets/MASTER-FIX-PROMPT-v2_1784528308962.md` — 14 residual work orders (R-01..R-14) + 58 new findings (NB-001..058; NB-052 merged into NB-041 by the audit).

Status legend: FIXED = code fix verified live on dev · FIXED-DATA = data fix applied to dev via admin API, prod run journaled in `scripts/run23-data-fixes-prod.ts` · FIXED-PRIOR = fixed in an earlier run, re-verified · PLATFORM = not app-fixable, documented · COVERED-BY = acceptance satisfied by another finding's fix.

Final gate (`fix-evidence-v2/final/`): tsc clean · migration-drift clean · P0 smoke desktop@1440 + mobile@375 (home grid, category cards, resource+outbound, search, submit gate, overflow=0, zero page errors) + auth flows (journey step toggle net-zero, admin approvals) · chunk-failure injection on 3 routes (/journeys, /search, /about — 1 auto-reload → retry card in live chrome → recovery) · QA teardown net-zero (`__qa_test%` = 0 users/resources/journeys).

| ID | Severity | Finding | Status | Evidence |
|---|---|---|---|---|
| R-01 | HIGH | Run prod data script: dead link AviSynth → avisynth.nl still live | FIXED-DATA (prod, executed) | `fix-evidence-v2/R-01-05/` |
| R-02 | HIGH | Run prod data script: dead link UT Video → umezawa.dyndns.info still live | FIXED-DATA (prod, executed) | `fix-evidence-v2/R-01-05/` |
| R-03 | LOW | Run prod data script: 10 plain-HTTP destinations unchanged | FIXED-DATA (prod, executed) | `fix-evidence-v2/R-01-05/` |
| R-04 | LOW | Run prod data script: self-referential entry 184919 still live | FIXED-DATA (prod, executed) | `fix-evidence-v2/R-01-05/` |
| R-05 | LOW | Run prod data script: journey 8 step 6 still orders Part 2 before Part 1 | FIXED-DATA (prod, executed) | `fix-evidence-v2/R-01-05/` |
| R-06 | MEDIUM | PARTIAL: home/categories/advanced/about/taxonomy still fetch the 3.1MB corpus + nav (regressed  | FIXED | `fix-evidence-v2/R-06/` |
| R-07 | LOW | Logged-out /submit inputs still not semantically disabled (only the button was fixed) | FIXED-PRIOR (Run22 code, republish pending) | `fix-evidence-v2/R-07/` |
| R-08 | LOW | Two card designs persist: category pages still lack favorite/bookmark/Open-Link | FIXED | `fix-evidence-v2/R-08/` |
| R-09 | LOW | PARTIAL: 4/56 sampled titles still sever the brand ("— Awesome…") | FIXED | `fix-evidence-v2/R-09/` |
| R-10 | LOW | PARTIAL: journey mobile rows still wrap titles 4–5 lines at 375px | FIXED | `fix-evidence-v2/R-10/` |
| R-11 | LOW | Hashed assets still Cache-Control: private + contradictory expires + Set-Cookie: GAESA | ORIGIN-CORRECT / PLATFORM-EDGE (documented) | `fix-evidence-v2/R-11/` |
| R-12 | LOW | PARTIAL: sitemap lastmod still batch-stamped for dated URLs; 8 hub pages still undated | FIXED | `fix-evidence-v2/R-12/` |
| R-13 | LOW | http→https redirect still includes :443 (platform/edge layer) | PLATFORM (documented) | `fix-evidence-v2/R-13/` |
| R-14 | LOW | www.awesome.video still NXDOMAIN; HSTS still includeSubDomains | PLATFORM/DNS (user action: registrar record) | `fix-evidence-v2/R-14/` |
| NB-001 | HIGH | Lazy-chunk load failure bricks the entire app — no ErrorBoundary around lazy routes | FIXED (+ reload-loop regression found & fixed at final gate) | `fix-evidence-v2/NB-001/` |
| NB-002 | HIGH | Unauthenticated AI-cost amplification: free-text goals cache-bust Claude generation | FIXED | `fix-evidence-v2/NB-002/` |
| NB-003 | MEDIUM | /api/public/resources?limit=-1 dumps all 2,292 rows | FIXED | `fix-evidence-v2/NB-003/` |
| NB-004 | MEDIUM | /api/public/resources?page=-1 → 500 (negative OFFSET) | FIXED | `fix-evidence-v2/NB-004/` |
| NB-005 | MEDIUM | /api/health/ai?deep=1: anonymous paid Claude round-trip + stats leak | FIXED | `fix-evidence-v2/NB-005/` |
| NB-006 | MEDIUM | Unauthenticated unthrottled GitHub-search proxy (shared quota drain) | FIXED | `fix-evidence-v2/NB-006/` |
| NB-007 | MEDIUM | /api/recommendations unclamped limit (500→500, -5→980) | FIXED | `fix-evidence-v2/NB-007/` |
| NB-008 | MEDIUM | Unbounded numeric IDs → 500 on five GET endpoints | FIXED | `fix-evidence-v2/NB-008/` |
| NB-009 | MEDIUM | Theme Accent+Font radiogroups lack keyboard semantics | FIXED | `fix-evidence-v2/NB-009/` |
| NB-010 | MEDIUM | Anonymous /recommendations downloads the 3.1MB corpus it never renders | FIXED | `fix-evidence-v2/NB-010/` |
| NB-011 | MEDIUM | Tag filter case-SENSITIVE on sub/sub-subcategory pages | FIXED | `fix-evidence-v2/NB-011/` |
| NB-012 | MEDIUM | Admin users CSV export contains masked emails | FIXED | `fix-evidence-v2/NB-012/` |
| NB-013 | MEDIUM | Same document catalogued twice (4 verified pairs) | FIXED-DATA (dev applied; prod journaled) | `fix-evidence-v2/NB-013/` |
| NB-014 | MEDIUM | 48 descriptions truncated mid-sentence | FIXED-DATA (dev applied; prod journaled) | `fix-evidence-v2/NB-014/` |
| NB-015 | MEDIUM | Recommendation/learning-path endpoints skip the public serializer | FIXED | `fix-evidence-v2/NB-015/` |
| NB-016 | MEDIUM | POST /api/recommendations/feedback: unauthenticated write, spoofable userId | FIXED | `fix-evidence-v2/NB-016/` |
| NB-017 | MEDIUM | SSR-hold overlay blocks interaction ~840ms after app ready (home) | FIXED | `fix-evidence-v2/NB-017/` |
| NB-018 | MEDIUM | Client HTTP-cache staleness on /api/user/journeys (INTERMITTENT) | FIXED | `fix-evidence-v2/NB-018/` |
| NB-019 | LOW | offset=1e20 → 500; page=1e18 → 200 absurd metadata | FIXED | `fix-evidence-v2/NB-019/` |
| NB-020 | LOW | Lax parseInt IDs: /api/public/resources/184919xyz → 200; /api/journeys/8abc → 200 | FIXED | `fix-evidence-v2/NB-020/` |
| NB-021 | LOW | /api/search: total promises unreachable matches (no pagination) | FIXED | `fix-evidence-v2/NB-021/` |
| NB-022 | LOW | /api/claude/analyze: caller errors → 500; open to any registered user | FIXED | `fix-evidence-v2/NB-022/` |
| NB-023 | LOW | Three "who am I" endpoints, three contracts | FIXED | `fix-evidence-v2/NB-023/` |
| NB-024 | LOW | /api/admin/users: page=-1 → 500; limit=-1 → all 76 users | FIXED | `fix-evidence-v2/NB-024/` |
| NB-025 | LOW | API docs/spec drift; /api/docs 404s | FIXED | `fix-evidence-v2/NB-025/` |
| NB-026 | LOW | Rate-limit coverage inconsistent — 12+ public endpoints unthrottled | FIXED | `fix-evidence-v2/NB-026/` |
| NB-027 | LOW | Settings hub Security card → /profile (wrong tab) | FIXED | `fix-evidence-v2/NB-027/` |
| NB-028 | LOW | '/' shortcut types a literal '/' into the open search dialog | FIXED | `fix-evidence-v2/NB-028/` |
| NB-029 | LOW | Recent-searches auto-saves junk keystroke strings | FIXED | `fix-evidence-v2/NB-029/` |
| NB-030 | LOW | Search Enter dead no-op until async results render | FIXED | `fix-evidence-v2/NB-030/` |
| NB-031 | LOW | Search dialog fetches limit=1000 to render 15 rows; cache never shared | FIXED | `fix-evidence-v2/NB-031/` |
| NB-032 | LOW | Export button: no double-click guard (MD×2 downloads) | FIXED | `fix-evidence-v2/NB-032/` |
| NB-033 | LOW | scrollRestoration='manual' but never restores — Back lands at top | FIXED | `fix-evidence-v2/NB-033/` |
| NB-034 | LOW | Home cold-load regressed +17%: corpus + nav dual-fetch | COVERED-BY R-06 | `fix-evidence-v2/R-06/` |
| NB-035 | LOW | Transient ZERO-h1 window during hydration (~460ms; ~1s slow-3G) | FIXED | `fix-evidence-v2/NB-035/` |
| NB-036 | LOW | Unstyled app-chrome flash above the SSR preview | FIXED | `fix-evidence-v2/NB-036/` |
| NB-037 | LOW | GitHub "Recent Sync Jobs" not chronological | FIXED | `fix-evidence-v2/NB-037/` |
| NB-038 | LOW | /api/github/sync-history ships 2.7MB (embedded snapshots) | FIXED | `fix-evidence-v2/NB-038/` |
| NB-039 | LOW | Research Job History silently truncates to latest 20 | FIXED | `fix-evidence-v2/NB-039/` |
| NB-040 | LOW | One-click unconfirmed job starts (Researcher/Enrichment/Link Check/Validation) | FIXED | `fix-evidence-v2/NB-040/` |
| NB-041 | LOW | Audit tab renders server errors as the empty state | FIXED | `fix-evidence-v2/NB-041/` |
| NB-042 | LOW | Researcher form hardcodes "~1,950" fallback count (real 2,292) | FIXED | `fix-evidence-v2/NB-042/` |
| NB-043 | LOW | Near-duplicate cross-posted entries (3 pairs) | FIXED-DATA (dev applied; prod journaled) | `fix-evidence-v2/NB-043/` |
| NB-044 | LOW | Titles contain scraped &lt;title&gt; chrome (26+) | FIXED-DATA (33 retitles; prod journaled) | `fix-evidence-v2/NB-044/` |
| NB-045 | LOW | Description copy-pasted from sibling entry (186257 vs 185806) | FIXED-DATA (prod journaled) | `fix-evidence-v2/NB-045/` |
| NB-046 | LOW | 54% of catalog untagged (entire July batch) | FIXED (coverage endpoint + admin UI; bulk enrichment = admin-initiated) | `fix-evidence-v2/NB-046/` |
| NB-047 | LOW | Slug anomaly: iOS/tvOS → iostvos; metadata references ios-tvos (404) | FIXED (301 in code) + DATA (slug rename; prod journaled) | `fix-evidence-v2/NB-047/` |
| NB-048 | LOW | Register endpoint = account-enumeration oracle (409 explicit) | FIXED | `fix-evidence-v2/NB-048/` |
| NB-049 | LOW | Method-not-allowed inconsistent (404 vs 405, three 405 flavors) | FIXED | `fix-evidence-v2/NB-049/` |
| NB-050 | LOW | Error-envelope drift + login message oracle | FIXED | `fix-evidence-v2/NB-050/` |
| NB-051 | LOW | TRACE gets Google-branded HTML 405 from the edge | FIXED | `fix-evidence-v2/NB-051/` |
| NB-053 | INFO | Export UI copy omits YAML | FIXED | `fix-evidence-v2/NB-053/` |
| NB-054 | INFO | approvedAt null for 2,283/2,292 approved resources | FIXED (endpoint) + DATA (1,797 backfilled dev; prod journaled) | `fix-evidence-v2/NB-054/` |
| NB-055 | INFO | Tag-value casing chaos (73 variant families) | FIXED (endpoint) + DATA (74 families dev; prod journaled) | `fix-evidence-v2/NB-055/` |
| NB-056 | INFO | OpenAPI spec never served | FIXED | `fix-evidence-v2/NB-056/` |
| NB-057 | INFO | /api/health/ai exposes internal counters publicly | COVERED-BY NB-005 | `fix-evidence-v2/NB-005/` |
| NB-058 | INFO | No session-ID regeneration at login | FIXED | `fix-evidence-v2/NB-058/` |
| NB-052 | — | (merged into NB-041 by the audit itself) | COVERED-BY NB-041 | `fix-evidence-v2/NB-041/` |
