# Run16 findings table — BUG-001..096 (July 17, 2026)

Source audit: `attached_assets/Pasted--remediation-mission-...1784280811319.txt` (96 findings).
Status legend: **FIXED** (code fix this run, re-verified live) | **FIXED-PRIOR** (already fixed
before this audit; re-verified live) | **INVALID** (does not reproduce on the live system) |
**DATA-FIX** (data correction, not code; dev applied + prod journaled in
`scripts/run16-data-fixes-prod.ts`) | **BY-DESIGN** (deliberate behavior, rationale journaled) |
**PLATFORM** (Replit/Google edge infrastructure, not app code) | **DECLINED** (won't fix, rationale
journaled).

Verdict totals: 79 FIXED · 2 FIXED-PRIOR · 4 INVALID · 4 DATA-FIX · 5 BY-DESIGN · 1 PLATFORM · 1 DECLINED = 96.

Cross-cutting verification: tsc clean · migration-drift clean · P0 smoke 12/12 (`p0-smoke.txt`) ·
admin live checks 7/7 (`t007-admin-live-checks.txt`) · QA teardown net-zero (probe resources
187101/187102/187103 + research jobs 23–29 removed; `__qa_test` count 0).

| ID | Sev | Finding (abridged) | Verdict | Notes / evidence |
|---|---|---|---|---|
| BUG-001 | CRITICAL | Server accepts javascript:/ftp:/http: URLs on POST /api/resources | **FIXED** | Server-side HTTPS-only URL validation on resource create/edit/submit (`server/routes.ts`). `bug-001-https-only.txt`: javascript:/ftp:/http: → 400, https → accepted. |
| BUG-002 | HIGH | Every page blocks on 3.13MB /api/awesome-list, 2.2–5.5s | **FIXED** | Server-side cache + strong ETag/304 (`server/routes.ts`). `bug-002-awesome-list-cache.txt`: cold 152ms, warm 13ms, If-None-Match → 304/0 bytes. |
| BUG-003 | HIGH | QA test submission (example.com) publicly listed/searchable | **DATA-FIX** | Prod-only row 188454 (absent in dev). `scripts/run16-data-fixes-prod.ts` rejects it after republish. |
| BUG-004 | HIGH | Recommendations ignore Preferred Categories | **FIXED** | Preferred categories now weighted/filtered in `server/ai/recommendationEngine.ts`. |
| BUG-005 | HIGH | Taxonomy SPA never pushes history for pagination/filter/sort | **FIXED** | Pagination/subcategory/tag/sort state pushed to URL history in `Category.tsx`, `Subcategory.tsx`, `SubSubcategory.tsx`. |
| BUG-006 | HIGH | 'Open in new tab' button dead on some resource cards | **FIXED** | Dead-click path replaced with real anchor behavior (`ResourceCard.tsx`, `Category.tsx`). |
| BUG-007 | HIGH | Dead external link: /resource/185407 dyte.io blog | **DATA-FIX** | Dev applied: URL → Wayback snapshot 20250904075527 (dyte 502 verified vs root 200). Prod via `run16-data-fixes-prod.ts`. `data-fixes-dev.json`. |
| BUG-008 | HIGH | No server-side validation of researcher budget/maxTurns | **FIXED** | Preflight 400 with field errors at POST (`server/routes.ts` + client mirror in `ResearcherTab.tsx`). `bug-008-researcher-validation.txt`. |
| BUG-009 | HIGH | Resources filter reset to 'All' shows 0 resources | **FIXED** | Filter-reset sentinel handling in `ResourceManager.tsx`. |
| BUG-010 | HIGH | 'Seed Database' fires POST with no confirmation | **FIXED** | Confirmation dialog before seed POST (`DatabaseTab.tsx`). |
| BUG-011 | HIGH | Admin tables clipped on mobile/tablet, Actions unreachable | **FIXED** | Tables wrapped in x-scroll containers. Live check 375+768: body overflow 0px, inner scroller present (`t007-admin-live-checks.txt`). |
| BUG-012 | HIGH | Resources Edit dialog: zero client-side validation | **FIXED** | Title/URL validation before PUT (`ResourceManager.tsx`). |
| BUG-013 | HIGH | Journey steps editor lists 17–18 rows with duplicate step numbers | **FIXED** | Steps grouped by `stepNumber` (client + `LearningJourneyRepository`). Live check: journey 7 = 18 rows → 6 grouped cards (`t007-admin-live-checks.txt`). |
| BUG-014 | HIGH | Admin can self-demote instantly from own-row dropdown | **FIXED** | Server guard rejects self-demotion + client confirmation (`server/routes.ts`, `UsersTab.tsx`). |
| BUG-015 | HIGH | GitHub integration broken; 21 failed exports invisible | **FIXED** | Failed sync jobs + error messages ("Bad credentials") surfaced prominently in `GitHubSyncPanel.tsx`. Credential repair itself is user/platform config (Replit GitHub OAuth), not app code. |
| BUG-016 | MEDIUM | Fingerprinted assets served cache-control: private, max-age=0 | **FIXED** | Immutable long-max-age cache headers for hashed `/assets/*` (`server/index.ts`). `bug-016-094-prod-headers.txt`. |
| BUG-017 | MEDIUM | Tag-filter checkboxes have no accessible name (25 controls) | **FIXED** | Accessible names on tag-filter controls (`ui/tag-filter.tsx`). |
| BUG-018 | MEDIUM | Recommendation preference selects unlabeled | **INVALID** | Selects are labeled via shadcn `FormLabel`→trigger wiring. Live authed DOM probe: both triggers report names "Skill Level"/"Time Commitment" (`bug-018-labels-probe.txt`). |
| BUG-019 | MEDIUM | '% match' badge 4.20:1 contrast at 12px | **FIXED** | Badge palette/contrast corrected (`ai-recommendations-panel.tsx`). |
| BUG-020 | MEDIUM | 'Visit Resource' CTA is a JS-window.open button, not anchor | **FIXED** | CTA is a real `<a>` (middle-click/ctrl+click work) in `ResourceDetail.tsx`. |
| BUG-021 | MEDIUM | No rate-limit/lockout on local login | **FIXED-PRIOR** | run10/11 3-layer guard (burst 5/min → 429, 20/15min, per-account lock 423). Dev re-repro: `401×5 → 429` (`bug-021-login-ratelimit.txt`). Prod caveat: in-memory counters split across autoscale instances — journaled in `triage-decisions.md`. |
| BUG-022 | MEDIUM | Custom Select swallows Tab while open (site-wide) | **FIXED** | Tab key no longer swallowed (`ui/select.tsx`). |
| BUG-023 | MEDIUM | /advanced 'Activity' sort identical to 'Resource Count' | **FIXED** | Distinct activity sort key (`ui/category-explorer.tsx`). |
| BUG-024 | MEDIUM | /advanced 'Show subcategories' toggle renders nothing | **FIXED** | Toggle renders subcategory rows (`ui/category-explorer.tsx`). |
| BUG-025 | MEDIUM | Metrics > Categories counts contradict rest of site (923 vs 2303) | **FIXED** | Tab summed only the DIRECT-resource slice of the tree; now full rollup (`ui/community-metrics.tsx`). |
| BUG-026 | MEDIUM | Research job dies with raw process error | **FIXED** | Server preflight (BUG-008 wave) rejects bad jobs at POST; failure copy humanized. Historical failed rows retain raw strings (audit-trail integrity) — `triage-decisions.md`. |
| BUG-027 | MEDIUM | Researcher tab loads 971KB JSON (full logs embedded) | **FIXED** | Job-list endpoint projects summary fields; logs fetched per-job on demand (`researchService.ts`, `ResearcherTab.tsx`). `bug-027-joblist-projection.txt`. |
| BUG-028 | MEDIUM | Job History internally inconsistent (turns>max, cancelled with 73 finds) | **FIXED** | Accounting/clamp fixes in `researchService.ts`; historical rows #24–33 left as-is (created by old code) — `triage-decisions.md`. |
| BUG-029 | MEDIUM | No UI to view 189 rejected resources; stat dead-ends | **FIXED** | Pending/rejected stat cards deep-link (rejected → resources tab pre-filtered `?status=rejected`) (`AdminStats.tsx`, `ResourceManager.tsx`). |
| BUG-030 | MEDIUM | Mobile 375: Researcher sub-tab bar overflows viewport | **FIXED** | Sub-tab bar scrollable at narrow widths (`ResearcherTab.tsx`). |
| BUG-031 | MEDIUM | Add dialog: junk URL passes; category optional; status defaults oddly | **FIXED** | URL/category validation + explicit status on create (`ResourceManager.tsx`). |
| BUG-032 | MEDIUM | Sub-Subcats Edit doesn't pre-populate parents | **FIXED** | Parent category/subcategory pre-populated (`GenericCrudManager.tsx`). |
| BUG-033 | MEDIUM | Taxonomy add forms: no duplicate-name/length validation | **FIXED** | Duplicate-name + length validation (`GenericCrudManager.tsx`). |
| BUG-034 | MEDIUM | hashchange not handled; Back/Forward leave wrong tab | **FIXED** | hashchange + popstate handled; inbound slugs normalized (`AdminDashboard.tsx`). |
| BUG-035 | MEDIUM | Resources table: no sorting/page-size/first-last on 2491 rows | **FIXED** | Sorting, page-size control, first/last pagination (`ResourceManager.tsx` + `server/routes.ts`). |
| BUG-036 | MEDIUM | Admin table renders javascript:/ftp: as clickable links | **FIXED** | Unsafe schemes rendered inert (`ResourceManager.tsx`). |
| BUG-037 | MEDIUM | Role changes commit instantly, no confirmation | **FIXED** | Confirmation dialog before role PUT (`UsersTab.tsx`). |
| BUG-038 | MEDIUM | /api/github/sync-history returns [] while sync-status holds records | **FIXED** | History endpoint merges queue + status records (`server/routes.ts`). `bug-038-sync-history-merge.txt`. |
| BUG-039 | MEDIUM | GitHub Import/Export fire POST with no confirmation | **FIXED** | Confirmations for DB-overwrite import / repo export (`GitHubSyncPanel.tsx`). |
| BUG-040 | MEDIUM | Audit 'Rows to show' selector never applies | **FIXED** | Selector drives query limit (`AuditTab.tsx`). |
| BUG-041 | MEDIUM | Audit API ignores offset; 'total' echoes limit | **FIXED** | Real offset + true total count (`AuditRepository.ts`, `server/routes.ts`). `bug-041-084-audit-pagination.txt`. |
| BUG-042 | MEDIUM | Audit log records no authentication events | **FIXED** | login/logout/failed-login audit events (`server/routes.ts`). `bug-042-auth-audit.txt`. |
| BUG-043 | MEDIUM | Link Health claims 'all healthy' though no check ever ran | **FIXED** | Honest empty state distinguishing "never checked" (`LinkHealthDashboard.tsx`). |
| BUG-044 | MEDIUM | /api/search treats % and _ as unescaped LIKE wildcards | **FIXED** | LIKE metacharacters escaped (`ResourceRepository.ts`). `bug-044-like-escape.txt`: `q=___` no longer dumps catalog. |
| BUG-045 | MEDIUM | Mobile 404: 'Browse all categories' CTA clipped off-viewport | **FIXED** | CTA layout fixed (`not-found.tsx`); tablet probe in run15 suite pattern. |
| BUG-046 | LOW | Rejecting an approved resource 500s | **FIXED** | Clean 409 with actionable message (`server/routes.ts`). `bug-046-reject-409.txt`. |
| BUG-047 | LOW | Header search placeholder clipped at tablet | **FIXED** | Placeholder/width fix (`AppHeader.tsx`). |
| BUG-048 | LOW | Duplicate 'Personalized Recommendations' heading stack | **FIXED** | Duplicate heading removed via `showHeader` pass-through (`ai-recommendations-panel.tsx`). |
| BUG-049 | LOW | Taxonomy touch targets below 24px | **FIXED** | Card title links + back links meet 24px minimum (`ResourceCard.tsx`, taxonomy pages). |
| BUG-050 | LOW | Sub/sub-sub pages render ALL resources, no pagination | **FIXED** | Pagination on subcategory + sub-subcategory pages (`resource-view-modes.tsx`, both pages). |
| BUG-051 | LOW | Grid/List/Compact toggles missing on sub pages | **FIXED** | View-mode toggles added to `Subcategory.tsx`, `SubSubcategory.tsx`. |
| BUG-052 | LOW | 'Filter by Tag' absent on many sub pages | **FIXED** | Tag filter present on large sub pages (`ui/advanced-filter.tsx`). |
| BUG-053 | LOW | Sidebar badges sum 3,227 vs brand block '2,600+' | **INVALID** | Does not reproduce live: badge sum = flat total = 2,302, distinct ids 2,302, duplicate slots 0 (`bug-053-count-reconciliation.json`, captured from live prod). Audit predates run15 count-source-of-truth rework. |
| BUG-054 | LOW | 17 duplicate sub-subcat names + opaque -scNNNN slugs; 'FFMPEG' casing | **DATA-FIX** (partial) | 10 'FFMPEG'→'FFmpeg' renames applied dev + journaled for prod. Slug scheme (-scNNNN) retained deliberately (stable URLs; restructure declined). `data-fixes-dev.json`. |
| BUG-055 | LOW | Inconsistent ?view=general vs ?subcategory= URL schemes | **BY-DESIGN** | `?view=general` is the deliberate first-class "General (no subcategory)" filter (run14 decision); `?subcategory=` names real subcategories. Two distinct concepts, both deep-linkable. |
| BUG-056 | LOW | Placeholder description renders as content (/resource/185741) | **DATA-FIX** | Real Hybrik description applied dev + journaled for prod (`data-fixes-dev.json`, `run16-data-fixes-prod.ts`). |
| BUG-057 | LOW | 'View all in <Category>' 20px tap target | **FIXED** | Tap target ≥24px (`ResourceDetail.tsx`). |
| BUG-058 | LOW | Missing-resource pages fire duplicate GET /api/resources/:id | **FIXED** | Duplicate fetch eliminated (`AppHeader.tsx` breadcrumb query dedup). |
| BUG-059 | LOW | Breadcrumb omits taxonomy levels | **FIXED** | Category/subcategory levels in resource breadcrumb (`AppHeader.tsx`). |
| BUG-060 | LOW | /advanced filter/sort/tab state never enters URL | **FIXED** | Explorer state URL-synced (`ui/category-explorer.tsx`). |
| BUG-061 | LOW | /submit validation copy nits | **FIXED** | "URL is required" for empty; duplicate banner copy corrected (`SubmitResource.tsx`). |
| BUG-062 | LOW | Consent banner obscures form controls at tablet/mobile | **FIXED** | Banner no longer overlaps interactive content (`ui/consent-banner.tsx`). |
| BUG-063 | LOW | Only first invalid field highlighted on /submit | **FIXED** | `aria-invalid` styling on all invalid fields (`ui/input.tsx`, `ui/select.tsx`, `ui/textarea.tsx`). |
| BUG-064 | LOW | /login empty submit: no 'password required' message | **FIXED** | Both field errors reported (`Login.tsx`). |
| BUG-065 | LOW | /submit tags: no per-tag length validation | **FIXED** | Per-tag length cap client-side (`SubmitResource.tsx`). |
| BUG-066 | LOW | Mobile /advanced tab bar clips 4th tab, no scroll affordance | **FIXED** | Scrollable tab bar with affordance (`Advanced.tsx`). |
| BUG-067 | LOW | /privacy references About page without linking it | **FIXED** | Link added (`Privacy.tsx`). |
| BUG-068 | LOW | ~30 Tab stops to reach /login form | **BY-DESIGN** | Skip link ("Skip to main content", auditor's own tab stop #1) is the standard WCAG 2.4.1 bypass — 2 stops to the form. Reordering DOM would break reading order site-wide. `triage-decisions.md`. |
| BUG-069 | LOW | Registration requires no email verification | **BY-DESIGN** | Local auth is the dev/admin path; public sign-in is Replit Auth (OAuth-verified). No mail infrastructure exists; instant accounts hold only 'user' role and submissions are moderated. `triage-decisions.md`. |
| BUG-070 | LOW | Enrichment history contradicts itself (failed @ 100% success) | **FIXED** | Success-rate/status accounting fixed (`BatchEnrichmentPanel.tsx`). |
| BUG-071 | LOW | Icon-only job-detail buttons no accessible name | **FIXED** | `aria-label` on view-details / cancel job buttons (`ResearcherTab.tsx`). |
| BUG-072 | LOW | Badge renders '31 totaljobs' (missing space) | **FIXED** | Spacing fixed (`BatchEnrichmentPanel.tsx`). |
| BUG-073 | LOW | 'Warnings (1284)' expander 140×20px touch target | **FIXED** | Expander target enlarged (`BatchEnrichmentPanel.tsx`). |
| BUG-074 | LOW | /admin?tab=export deep link silently ignored | **FIXED** | `?tab=` normalized alongside hash slugs (`AdminDashboard.tsx`, shared with BUG-034/085). |
| BUG-075 | LOW | Stat cards not navigable | **FIXED-PRIOR** | Cards deep-link via `onNavigate` since R4-L17; this run extended pending/rejected deep-links (BUG-029). |
| BUG-076 | LOW | UI '189 rejected' vs API 'totalDeleted' | **INVALID** | Terminology-only: an internal API field name vs UI copy; same number, no functional defect, field rename would break consumers for zero user value. |
| BUG-077 | LOW | Admin loading state is bare 'Loading...' text | **FIXED** | Skeleton loading state in admin main area. |
| BUG-078 | LOW | Empty queue states offer no refresh/retry | **FIXED** | Refresh controls on empty Approvals/Edits states. |
| BUG-079 | LOW | Mobile avatar menu button no accessible name | **FIXED** | `aria-label` on avatar menu trigger (`AppHeader.tsx`). |
| BUG-080 | LOW | Empty search shows 'Showing 1 - 0 of 0' + blank body | **FIXED** | Proper "0 resources" empty state (`ResourceManager.tsx`), verified live. |
| BUG-081 | LOW | Disabled Delete buttons give no reason | **FIXED** | Tooltip explains rows-with-resources block (`GenericCrudManager.tsx`). |
| BUG-082 | LOW | Add Resource dialog does not close on Escape | **INVALID** | Does not reproduce: live check opens dialog, presses Escape, dialog closes (before=1 after=0) — `t007-admin-live-checks.txt`. |
| BUG-083 | LOW | Audit rows not clickable, no detail view | **FIXED** | Row detail view with full Notes/Changes (`AuditTab.tsx`). |
| BUG-084 | LOW | Audit 'By' column shows truncated raw UUID | **FIXED** | Actor resolved to email/name (`bug-041-084-audit-pagination.txt`). |
| BUG-085 | LOW | /admin#link-health does not select Link Health tab | **FIXED** | Slug alias normalization (`AdminDashboard.tsx`). |
| BUG-086 | LOW | Tab switches replace history; Back exits dashboard | **FIXED** | `pushState` on tab clicks; Back returns to prior tab (`AdminDashboard.tsx`). |
| BUG-087 | LOW | Users table no sorting; User column duplicates Email | **FIXED** | Sortable headers + distinct columns (`UsersTab.tsx`). |
| BUG-088 | LOW | Mobile Users/Audit tables unmarked horizontal scroll | **FIXED** | Marked scroll containers; live check 375+768 PASS (`t007-admin-live-checks.txt`). |
| BUG-089 | LOW | Users CSV export returns masked emails | **BY-DESIGN** | Deliberate PII minimization matching the DOM-wide masking policy (Run14/15); unmasked CSV would be the easiest exfil path. `triage-decisions.md`. |
| BUG-090 | LOW | /api/resources pagination validation inconsistent | **FIXED** | Uniform clamp/400 behavior (`bug-090-pagination-clamp.txt`). |
| BUG-091 | LOW | API error-shape inconsistency ({error} vs {message}, 404 bodies) | **FIXED** | Unified error shape + 405-with-Allow where applicable (`bug-091-method-allow.txt`). |
| BUG-092 | LOW | GAESA cookie without Secure/HttpOnly/SameSite | **PLATFORM** | Injected by Replit's Google-infra edge before the app runs; app never sets it, cannot alter attributes. `triage-decisions.md`. |
| BUG-093 | LOW | 7-day session, no 'remember me' option | **BY-DESIGN** | Intentional 7-day HttpOnly+Secure+Lax server-side revocable session; split TTL is product preference, not defect. `triage-decisions.md`. |
| BUG-094 | LOW | HSTS missing preload; CSP style-src 'unsafe-inline', img-src https: | **FIXED** | HSTS preload + CSP tightening where compatible (`server/index.ts`, `bug-016-094-prod-headers.txt`). Residual `style-src 'unsafe-inline'` is required by the runtime CSS-in-JS/radix inline styles — noted in evidence. |
| BUG-095 | LOW | sitemap.xml identical lastmod on all 2,522 URLs | **FIXED** | Per-URL lastmod from real update timestamps (`bug-095-sitemap-lastmod.txt`). |
| BUG-096 | LOW | No per-client rate limiting on 3.1MB /api/awesome-list | **DECLINED** | Materially mitigated by BUG-002 cache+ETag/304 (repeat fetches 3ms/0 bytes); in-process limiters split across autoscale instances; edge limits are platform territory. `triage-decisions.md`. |

## Prod follow-ups (after republish)
1. Run `npx tsx scripts/run16-data-fixes-prod.ts` — rejects QA row 188454 (BUG-003), repoints
   185407 to the Wayback snapshot (BUG-007), fixes 185741 description (BUG-056), applies the
   FFMPEG→FFmpeg renames (BUG-054). Idempotent; uses the live admin API (prod DB is not
   agent-writable).
2. Prod caveat journaled: login/global rate limiters are per-instance in-memory (BUG-021/096).
