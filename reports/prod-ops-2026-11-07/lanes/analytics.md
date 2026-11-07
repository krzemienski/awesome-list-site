# Lane analytics: usage sources and per-function usage (prod-ops 2026-11-07)

Revision seen at `/api/version`: `1cd25ab06e344b1db198857910a95486efe36082`. Pulls at 2026-11-07T20:30Z (process booted 18:52:43Z, so DOC counters cover about 1 h 38 min). Read-only: GETs only, no PostHog access, no writes. Session `po1107-analytics-1` (audit admin state, role=admin via `/api/auth/user`), closed. `agent-browser` has no `route` command, so the POST /api/recommendations abort could not be installed; I opened `/admin` (not Home) and only ran `fetch()` GETs, so no recommendation call was made. Evidence (aggregates only, no emails or names): `WT/e2e-evidence/prod-ops-2026-11-07/analytics/usage-health-stats.json`, `audit-users-aggregates.json`.

## 1. Source status

| Source | Status | Window | What it sees | Unblock step |
|---|---|---|---|---|
| PostHog (plugin 1.1.91, `mcp.posthog.com/mcp`) | **BLOCKED** | none | Post-consent only, no bots/QA in practice (see 2). Project id and region unknown. | `claude mcp list` shows `plugin:posthog:posthog ! Needs authentication`; the session exposes only `authenticate` / `complete_authentication`. Owner: `/mcp` -> plugin:posthog:posthog -> finish OAuth. Lead then runs the read-only pass (SDK health, `$pageview` by path 28/90 d, `$exception`, sign-up/submission funnels, `$virt_traffic_type`, `$http_log`, Error Tracking, replay/heatmap flags). Expected: no `$http_log` (no log capture in code, 2). |
| First-party `/api/admin/usage` | **PULLED** | 28 d, 90 d, all time; real vs test | Logged-in member features only; no anonymous visitors | none |
| First-party `/api/admin/operations/health` DOC:* | **PULLED (partial)** | in-memory since boot 18:52:43Z (1 h 38 min) | Every page document by template x client class x status, pre-consent, bots included. Cannot separate our QA lanes from humans | History needs persistence (next-step: log hourly deltas). |
| First-party `/api/admin/users`, `audit-logs`, `stats` | **PULLED** | all rows (145 users, 19,419 audit rows) | sign-up dates, admin/member actions | none |
| `/api/admin/logs` | not pulled | max 7 d | API request lines only; successful page views not logged | n/a (cannot give 28/90 d) |
| GA4 | **BLOCKED** | none | Consent-gated, no bots/QA | No GA MCP configured (`claude mcp list`), no gcloud (`which gcloud` empty), no `~/.config/gcloud/application_default_credentials.json`, no `~/.config/awesome-audit`, no GOOGLE_/GA4_ env names. Owner steps: owner-analytics-steps §2 (property id, Viewer service account, JSON key to `~/.config/awesome-audit/ga4-reader.json`, plus the Enhanced-measurement History screenshot). |
| Search Console | **BLOCKED** | none | Google organic impressions/clicks | owner-analytics-steps §3 (add the same service account as Restricted user, or export CSV). |
| Replit Analytics (Umami) | **BLOCKED** | none | Sees page views before and regardless of consent (docs/ANALYTICS.md) | Owner screenshots per owner-analytics-steps §1 into `reports/prod-ops-2026-11-06/evidence/analytics/owner/`. `ls` of that dir, `~/Downloads` and the repo found no screenshots (only an unrelated `compass_artifact_*.md`). |
| Mixpanel / Amplitude | **BLOCKED** | none | Consent-gated (Mixpanel also gets server-side `sign_up_completed` when the consent header is sent) | No env names or MCP found. Owner: Mixpanel service account + project id; Amplitude MCP OAuth or API key+secret. |

## 2. Instrumentation facts (rev 1cd25ab0)

- **PostHog features initialised** (`client/src/lib/analytics-sdk-options.ts:68-112`): autocapture `:82`; SPA pageviews `capture_pageview:'history_change'` `:83`; pageleave `:84`; exception capture `capture_exceptions:true` `:85`; web vitals/network `capture_performance:true` `:86`; heatmaps `:87`; session replay ON `disable_session_recording:false` `:88`, `maskAllInputs` + `maskTextSelector:'*'` `:93-94`; `request_batching:false` `:110`; persistence `localStorage+cookie` `:75`. Feature flags and surveys are claimed in the header comment (`posthog.ts:8-9`) but no flag/survey option is set in the init options. Logs capture: nothing in code (`grep http_log|captureLog` found none), so no `$http_log` events are expected.
- **Consent gating**: SDK loaded by dynamic import only after grant (`posthog.ts:3-5,72`); `vendorSdksAllowed()` = consent granted and not suppressed (`analytics.ts:70-71`); `opt_out_capturing_by_default:true` (`analytics-sdk-options.ts:74`); `before_send` drops events on QA paths and admin sessions (`:105`); URL scrub `:101-102`; revoke disposes replay and clears storage (`posthog.ts:117-137`). Same gate covers GA4, Mixpanel, Amplitude. Replit Analytics is not gated: the platform injects it, only the custom events stop on Decline (`analytics.ts:46-49`, 07b t-telemetry confirmed 3 Umami sends before any choice, 0 vendor requests).
- **Server-side capture**: PostHog none (`package.json:93` only `posthog-js`; no `posthog-node`). Mixpanel only: `server/lib/mixpanelServer.ts:102` `trackServerEvent`, consent header `x-analytics-consent: granted` (`:16,:48`), called for `sign_up_completed` (`server/clerkAuth.ts:148`) and `resource_submitted` (`catalog-contributions.ts:913`).
- **First-party telemetry**: API requests -> `endpointGroup`/`recordEndpointLatency` and a log line (`server/index.ts:523-545`); page documents counted as `DOC:<template>:<class>:<Nxx>` (`server/index.ts:558-562`, `operationalTelemetry.ts` `documentTemplate`, `clientClass` with search/AI/other bot regexes, `recordDocumentRequest`). In-memory, no persistence, no timestamps, no IP/UA/path stored. Successful documents are not logged.
- **Privacy policy vendors** (`shared/legal-policy-content.tsx:95-97`; component `client/src/pages/Privacy.tsx` -> `LegalPolicyPage`): Google Analytics 4, Mixpanel, PostHog, Amplitude, Replit Analytics, Clerk (`:91-92`). It says PostHog masks page text and inputs and Mixpanel may receive name and email (`:97`, matches `analytics-sdk-options.ts:20-28`; PostHog person props exclude PII `:36-43`).
- **GA4 Enhanced-measurement History setting**: still unknown. docs/ANALYTICS.md:16-28 says it must be OFF; cannot be read without GA access.

## 3. Per-function usage (28 d / 90 d)

QA excluded = the "real" bucket of `/api/admin/usage` (heuristic test-account definition, `testDefinition:"heuristic"`). "Real" is an upper bound.

| Function | 28 d | 90 d | Source | QA excl.? | Bots excl.? |
|---|---|---|---|---|---|
| Sign-up (account created) | 21 real / 3 test | 39 real / 5 test | users.createdAt via `/api/admin/users`, same regex as 11-06. `/api/admin/usage` signupsByMonth real: Aug 4, Sep 11, Oct 19, Nov (to 7th) 5 | yes | n/a |
| Resource submission | 16 rows / 13 users (test 17 / 2) | 28 / 24 (test 44 / 3); all-time real 31 / 27 | usage `submissions` | yes | n/a |
| Interactions (view/click rows, signed-in) | 11 rows / 4 users (test 183 / 4) | 36 / 10 (test 839 / 5) | usage `interactions` | yes | n/a |
| Bookmarks | 0 real (test 3) | 0 (test 3); all-time real 0 | usage | yes | n/a |
| Favorites | 0 | 0; all-time real 0 | usage | yes | n/a |
| Collections / collection items | 0 / 0 | 0 / 0; all-time 0 | usage | yes | n/a |
| Journey enrolment | 0 real (test 3) | 0 real (test 8); all-time real 3 rows / 3 users | usage | yes | n/a |
| Journey completed | 0 | 0 (test 1) | usage | yes | n/a |
| Recommendation feedback | 0 real | 0 real (test 1 current row) | usage (current-state table) vs audit-log events below | yes | n/a |
| Edit suggestions | 0 real (test 1) | 0 (test 14); all-time real 1 | usage | yes | n/a |
| API keys created / used | 0 / 0 real (test 38 / 15) | 0 / 0 (test 40 / 17) | usage | yes | n/a |
| Digest opt-ins | 0 real (test 2) | 0 (test 2) | usage | yes | n/a |
| Notifications read | 0 real | 0 (test 2) | usage | yes | n/a |
| Admin: approvals / edits (owner work) | approved 11 / rejected 11 / created 64 / updated 101 non-test rows | 13 / 11 / 76 / 102 | audit-logs by action (regex on `performedByEmail`; owner mail matches the regex so these admin counts are unreliable, see 4) | partly | n/a |
| Withdrawn submissions | 21 non-test / 14 test | 21 / 50 | audit-logs | yes | n/a |
| Page views, search, browse, resource view, tag, journey (anonymous) | **no 28/90 d data** (blocked GA4/PostHog/Replit) | **no 28/90 d data** | only in-memory DOC counters, 1 h 38 min, below | no | partly (class column) |
| Link reports, contact form | no new data this run (11-06: 0 reports; only QA contact messages) | | 11-06 lane | | |
| Researcher/enrichment/GitHub sync | `ai_enriched` 42 non-test, `research_started` 20 test (28 d); no endpoint for visits | same | audit-logs | partly | n/a |

DOC page documents since boot (18:52:43Z to 20:30Z), classes as counted by `clientClass`:

| Template | human | bot-ai | bot-search | bot-other | statuses |
|---|---|---|---|---|---|
| home | 42 | 0 | 0 | 68 | 2xx 109, 3xx 1 |
| resource | 106 | 168 | 15 | 103 | 2xx 329, 4xx 63 |
| category | 15 | 8 | 0 | 3 | 2xx 25, 4xx 1 |
| subcategory | 10 | 16 | 1 | 8 | 2xx 34, 4xx 1 |
| subsubcategory | 7 | 6 | 0 | 1 | 2xx 11, 3xx 2, 4xx 1 |
| tag | 29 | 11 | 0 | 11 | 2xx 50, 4xx 1 |
| search | 6 | 0 | 0 | 0 | 2xx 6 |
| journey / journeys | 4 / 3 | 0 | 0 | 0 | journey 2xx 2, 4xx 2; journeys 2xx 3 |
| other | 39 | 0 | 0 | 5 | 2xx 28, 3xx 11, 4xx 5 |
| total | 261 | 209 | 16 | 199 | 685 documents |

Caveat: "human" includes our own audit lanes (this run's visitor/member/admin lanes ran in this window), so real-human visits are lower than 261. 4xx on `resource` (63) is high; likely probes and lane 404 checks, not diagnosed here. Bots outnumber humans: 424 of 685 (62%), AI bots 31% (`resource` 168).

Audit-log recommendation feedback (events, non-test only, 28 d / 90 d): helpful 8/8, hidden 16/16, not_for_me 5/5, already_known 2/2, restored 30/30. Usage shows 0 real rows for the same feature, see 4.

## 4. Mismatches and broken signals

1. **`auth.login`/`auth.register` audit rows are dead.** Last rows: login 2026-08-10T11:59:11Z, register 2026-08-10T11:59:11Z, logout 2026-08-03, login_failed 2026-08-03 (`audit-users-aggregates.json`). No writer exists: `auth.login|auth.register|auth.logout` appear only in `client/src/components/admin/AuditTab.tsx:110-113` (display labels), nothing in `server/` or `shared/`. Replacements: `users.createdAt` (21 real sign-ups in 28 d against 0 register rows), `/api/admin/usage` signupsByMonth (`admin-usage.ts:138-146`), and Mixpanel `sign_up_completed` (`clerkAuth.ts:148`, consent-gated). Logins have no replacement at all.
2. **Sign-ups vs `sign_up_completed`**: cannot be reconciled (Mixpanel/PostHog blocked); by design the vendor count is lower (consent header `x-analytics-consent`).
3. **Usage vs audit-log disagree on recommendation feedback**: usage has 1 row ever (test); audit log has 257+ feedback events including non-test ones. The table stores current state per user/resource and cascades on user delete (admin-usage note), the audit log keeps events. Do not read the usage zero as "unused".
4. **Test-account heuristic is inconsistent between endpoints**: the audit-log regex `owner` classifies the owner's own admin work as "test", while `/api/admin/usage` real/test split is server-side. Admin-action counts in the audit table are not trustworthy for real-vs-test.
5. **Real member-feature usage is almost nil**: 0 real bookmarks, favorites, collections, API keys, digest opt-ins in 90 d, against 38 test API keys created in 28 d. Only submissions (13 real users in 28 d), sign-ups and 4 users with interactions show real use. Test traffic dominates (interactions 183 test vs 11 real in 28 d).
6. **No anonymous 28/90 d series exists** in any reachable source; all three vendors that could answer are blocked. DOC counters reset every deploy (boot 18:52:43Z) and mix lanes with humans.
7. Expected, unchecked: Replit >= GA4 ~ PostHog; DOC human page views vs PostHog pageviews over the same window cannot be compared yet. GA4 Enhanced-measurement double page_view unknown.
8. Totals drift: users 145 now (143 on 11-06); resources table 4,319 rows vs `totalPublic` 4,064, 154 rejected, 0 pending.

## 5. Metrics with no endpoint

- Login counts (no audit rows since 2026-08-10, no other source).
- Anonymous page views, unique visitors, referrers, landing pages, search terms at 28/90 d (only in vendors).
- Per-day or per-week series of any member feature (usage returns windows only).
- API key requests (`lastUsedAt` is last use only; no request counter; `/api/public` calls are not exposed per key, telemetry group `public-api` was empty in this snapshot).
- Digest sends and opens (`lastEmailDigestAt` not exposed by usage), journey step-level progress, notification delivery.
- Bot vs human and real-vs-QA split for page documents; DOC counters persistence.
- Page-view history across deploys.

## 6. Codemap coverage (07b codemap, 95 functions F-*)

Q = QA excluded (real bucket of `/api/admin/usage` or non-test audit rows). DOC = in-memory page-document counter (since boot 18:52:43Z, bots split, lanes not split). "no usage data" = no source reaches it at 28/90 d.

| Functions | 28 d / 90 d | Source | Q | Bots excl. |
|---|---|---|---|---|
| F-DISC-01..07, 14 (home, categories, category, subcategory, sub-sub, tag, resource, catalog APIs) | no usage data at 28/90 d; DOC counts in section 3 and 7 | DOC only | no | yes (class column) |
| F-DISC-08, 09, 11, 13 (about, legal, redirects, shell) | no usage data (`other` template: 40 human documents by 20:59Z, not split per page) | DOC | no | yes |
| F-DISC-10, 12 (sidebar, SSR/SEO) | no usage data; SSR bot fetch visible via DOC bot-search 19, bot-ai 252 | DOC | no | yes |
| F-SRCH-01..07 (palette, search page, filters, sort, typo, home search, backend) | search page documents: 8 human, 0 bots since boot; palette/API use: no usage data | DOC | no | yes |
| F-RESIL-01..07 (404, offline, chunk, error, slow, health, API fallbacks) | no usage data; 4xx documents: resource 63 by 20:30Z | DOC statuses | no | n/a |
| F-TEL-01..06 (consent, vendor events, Umami, suppression, vitals, server telemetry) | no usage data (consent accept rate unknown, vendors blocked) | none | n/a | n/a |
| F-AUTH-01 sign-up | 21 / 39 real | users.createdAt | yes | n/a |
| F-AUTH-02..08 (sign-in, admin login, sign-out, session, guards, redirects, reset) | no usage data (auth.* rows dead since 2026-08-10) | none | n/a | n/a |
| F-AUTH-09 (authz contract) | no usage data | none | n/a | n/a |
| F-MCON-01 submit | 16 rows/13 users / 28 rows/24 users | usage submissions | yes | n/a |
| F-MCON-02 suggest edit | 0 real / 0 real (1 all-time) | usage | yes | n/a |
| F-MCON-03 contributions page | no usage data (derived from submissions) | none | | |
| F-MCON-04 bookmarks | 0 / 0 | usage | yes | n/a |
| F-MCON-05 favorites | 0 / 0 | usage | yes | n/a |
| F-MCON-06, 07 guest bookmarks and merge | no usage data (localStorage, merge event only in vendors) | none | | |
| F-MCON-08, 09 collections, public collection | 0 / 0; public collection documents: template `collection` absent from DOC | usage, DOC | yes | yes |
| F-MCON-10 link report | no new data; 11-06: 0 ever | 11-06 lane | | |
| F-MACC-01 profile, 04 settings, 07 onboarding, 13 theme | no usage data | none | | |
| F-MACC-02 account deletion | no usage data (stats deletion-requested count not re-pulled) | none | | |
| F-MACC-03, 14 API keys and public API | 0 real keys created or used / 0; test 38 created in 28 d | usage | yes | n/a |
| F-MACC-05, 06 notifications, digest unsubscribe | digest opt-in 0 real; notifications read 0 real | usage | yes | n/a |
| F-MACC-08..10 journeys, detail, continue | enrolments 0 real in 28 d and 90 d (3 real all-time); completions 0; `journey`/`journeys` documents 7 human since boot | usage, DOC | yes | yes |
| F-MACC-11 recommendations | feedback events non-test 28 d: 8 helpful, 16 hidden, 5 not_for_me, 2 already_known, 30 restored | audit-logs | partly (regex) | n/a |
| F-MACC-12 advanced | no usage data | none | | |
| F-MACC-15 contact | no new data (11-06: QA messages only) | none | | |
| F-ACUR-01..09 admin curation | owner work, 28 d non-test rows: created 64, updated 101, approved 11, rejected 11, deleted 23, edit_approved 3, edit_rejected 5; ai_enriched 42 (90 d same); F-ACUR-09 AI analysis: no usage data | audit-logs | partly (owner matches regex) | n/a |
| F-AOPS-01..12 admin ops | exports 28 d non-test: database 1, resources 1, categories 1, catalog 4, users 0; backups 2; role changes 4; others no usage data | audit-logs | partly | n/a |
| F-ARES-01..06 researcher, enrichment, journeys manager | research_started 20 (all test), ai_enriched 42; journey editor events test only; no real runs | audit-logs | yes | n/a |

## 7. DOC counter comparison: health-1 (20:27Z) vs health-2 (20:59Z)

Evidence: `e2e-evidence/prod-ops-2026-11-07/lead/health-1.json`, `.../logs/health-2.json`. Format: health-1 -> health-2 (delta). Totals 559 -> 998 documents (+439 in 32 min).

| Template | human | bot-ai | bot-search | bot-other |
|---|---|---|---|---|
| home | 40->56 (+16) | 0 | 0 | 60->99 (+39) |
| resource | 55->120 (+65) | 163->226 (+63) | 15->19 (+4) | 103->108 (+5) |
| category | 8->16 (+8) | 8->8 | 0->1 | 3->5 (+2) |
| subcategory | 5->14 (+9) | 15->17 (+2) | 1->1 | 8->11 (+3) |
| subsubcategory | 2->7 (+5) | 4->8 (+4) | 0->1 | 1->3 (+2) |
| tag | 24->34 (+10) | 11->17 (+6) | 0 | 11->13 (+2) |
| search | 6->8 (+2) | 0 | 0 | 0 |
| journey | 0->4 (+4) | 0->1 | 0 | 0->5 (+5) |
| journeys | 2->3 (+1) | 0 | 0 | 0->10 (+10) |
| other | 14->40 (+26) | 0 | 0 | 0->143 (+143) |

Reading: `other`/bot-other jumped by 143 in 32 min (a scanner or probe burst, not diagnosed, 4xx likely); resource human +65 while search-engine bots stayed at 19, so search-engine crawling is nearly absent; AI bots (+63 on resource) are the largest steady bot source. My own 20:30Z pull (685 documents) sits between the two snapshots and is consistent. Human counts still include audit lanes.
