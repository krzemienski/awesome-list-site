# Analytics lane — prod-ops 2026-11-06

Read-only. Only GETs to awesome.video (owner session, status checked by code). No logins, no writes. Raw pulls were kept in /tmp (outside the repo) and only aggregates are in `evidence/analytics/`. Windows: 90d = since 2026-08-08, 28d = since 2026-10-09.

## (a) Source status

| Source | Status | What I got | Credential that unblocks it / where |
|---|---|---|---|
| First-party DB via admin GETs | **Pulled (partial)** | users, sign-up dates, 19,155 audit-log rows, journeys, contact, link reports, enrichment coverage, ops telemetry | none needed. Gap: no per-feature table (see b) |
| Replit Analytics (Umami, website-id = replId `71ccccc7-…`) | **Blocked** | confirmed tracker injected (`i.replit.com/script.js`). No API found in Replit docs (the Monitoring page points to "Project Analytics in the Growth pane"). My one `ask_question` was bounced: the Agent was busy, question NOT submitted. I did not retry. | Owner opens Replit → project → Growth → Analytics (or Publishing → Analytics). Screenshots needed for 28d and 90d: totals (views, visitors), top pages, events list, daily chart. Alternative: owner creates a Umami API token if Replit exposes one (not confirmed). |
| GA4 | **Blocked** | Measurement id is a Replit secret (not read). | Owner: GA4 property id + add a **Viewer** service-account email (Admin → Property access management), or run `gcloud auth application-default login --scopes=https://www.googleapis.com/auth/analytics.readonly` on this Mac (gcloud not installed). |
| Search Console | **Blocked** | Only public signals (below). | Owner adds a service account / Google user as restricted user (Settings → Users and permissions) on the property; scope `webmasters.readonly`. |
| Mixpanel | **Blocked** | – | Project token is public, can't read. Owner: Org settings → Service Accounts (Viewer/Analyst) + project id, or OAuth via official MCP `https://mcp.mixpanel.com/mcp` (EU: `mcp-eu`). |
| PostHog | **Blocked** | – | Personal API key, scope `query:read` (Settings → Personal API keys) + project id; region US/EU. |
| Amplitude | **Blocked / route exists** | – | Plugin `mcp__plugin_marketing_amplitude(-eu)__authenticate` needs the owner's OAuth. I did not start it. Or Dashboard REST API key + secret (Project settings). |

Public signals (no credential): sitemap has 4,766 URLs (4,074 `/resource`, 280 `/tag`, 178 `/subcategory`, 174 `/category`, 46 `/sub-subcategory`, 5 `/journey`, plus static). `/api/admin/stats` totalPublic = 4,074, so the sitemap resource count matches approved resources exactly. robots.txt allows crawl, disallows `/api/`, `/admin`, `/profile`, `/bookmarks`. Home HTML carries the Umami script; no GA/gtag tag is in the server HTML (GA loads after consent, so absence is expected).

## (b) Per-feature usage

Test-account separation: the users API returns emails/names. I classified a row as test if the email matched `audit|qa[-_.0-9]|test|example.|+qa|mailinator|@vqa|owner` or the name matched `[AUDIT]`/`[QA`/`QA <n>`. This is a heuristic, so treat "real" as an upper bound. For audit-log rows the same pattern was applied to `performedByEmail`.

| Feature | Source | Window | Count | Notes |
|---|---|---|---|---|
| Accounts total | /api/admin/stats | now | 143 (4 admin, 139 user); 11 deletion-requested | |
| Sign-ups, all | /api/admin/users createdAt | 90d / 28d | 42 / 25 | |
| Sign-ups, non-test | same | 90d / 28d | **38 / 23** | by month non-test: 2026-08 4, 09 11, 10 19, 11 4 (to 6th; 3 on 11-06). 2026-07 spike: 85 all, only 9 non-test (QA burst). |
| Registrations in audit log | audit-logs `auth.register` | 90d / 28d | 1 / 0 | **broken signal**, see (c) |
| Logins in audit log | `auth.login` | 90d / 28d | 1 / 0 | same |
| Recommendation feedback (helpful / not for me / hidden / already known / restored) | audit-logs | 90d all (test) | 94(86) / 52(47) / 120(114) / 41(39) / 257(237) | 28d all (test): 36(28) / 20(15) / 37(31) / 12(10) / 98(78). Non-test only appears in Nov: 8 helpful, 5 not-for-me, 6 hidden, 2 already-known. Real use is tiny. |
| Edit suggestions | `edit_suggested` | 90d / 28d | 117 (116 test) / 78 (77 test) | one real suggestion in Nov |
| Edit approved / rejected | audit-logs | 90d | 34 / 59 (all test) | |
| Submissions withdrawn | `withdrawn` | 90d / 28d | 66 (50 test) / 31 (15 test) | 14 non-test in Nov, worth a look |
| Resources created / approved / rejected | audit-logs | 90d | 511 / 433 / 183 | nearly all actor-flagged test or admin work |
| Pending approvals | /api/admin/stats | now | 23 pending, 0 pending edits, 148 rejected | |
| Link reports (public) | /api/admin/link-reports | now | 0 reports, 0 open | |
| Contact submissions | /api/admin/contact-submissions | all time | total returned in list; the sampled item is a QA analytics-check message | not windowed; counts only |
| Journeys | /api/admin/journeys | now | 5 published, 6 steps each | **enrolment/progress counts are not exposed by any GET** |
| Bookmarks, favorites, collections, user progress, API-key counts, digest subscribers | – | – | **not obtainable** | endpoints exist only per signed-in user (`/api/bookmarks`, `/api/user/*`); no admin aggregate. `shared/schema.ts` lists only 8 tables via `pgTable("name"`; the rest are defined by other helpers, DB reports 41 tables. Needs DB read access (owner-approved read-only SQL) or a new admin aggregate endpoint (code change, out of scope). |
| API traffic (/api/public) | – | – | not obtainable | `lastUsedAt` per key exists in the schema but no admin read. `/api/admin/operations/health` telemetry is process-lifetime only: ~5.8k selects, 440 `GET:other:2xx`, 70 catalog GETs since last restart. |
| `/advanced` community-metrics | client code | – | not a usage source | computed in the browser from the resource list ("real counts" of catalog, not visits) |
| Enrichment coverage | /api/admin/enrichment/coverage | now | 1,091 of 4,074 tagged (26.8%) | content metric, not usage |
| Page views / visitors / top pages / events | Replit, GA4, vendors | 28d, 90d | **no data** | blocked, see (a) |

Deploy-date view: audit-log volume by day is available in the evidence file `audit-log-monthly-by-action.json` (monthly only; daily series was not saved). Publish commits since 2026-08-08 cluster on 08-13…08-27, 09-02 (13 commits), 10-06…10-13, 10-21…10-27, 11-04. Without page-view series no before/after deploy comparison is possible.

## (c) Broken signals

1. **`auth.login`/`auth.register` audit rows stop after 2026-08** (Jul 298, Aug 193 combined, nothing since) while 23 non-test accounts signed up in the last 28 days. Auth moved to Clerk and the audit hook no longer fires. Sign-up counts must come from `users.createdAt`.
2. **Real usage is hidden by QA volume**: 85 of 143 accounts and ~92% of recommendation feedback and ~99% of edit suggestions are test-flagged. Any usage metric from the DB needs the filter above.
3. **No admin aggregate for bookmarks/collections/journey enrolment/API keys/digest.** Biggest gap for per-feature demand.
4. **GA4 history-event double page_view** status unknown (docs/ANALYTICS.md prerequisite). Cannot be checked without GA access; owner reads Admin → Data streams → Enhanced measurement. If still on, SPA page views are ~2× inflated.
5. Replit `ask_question` returned "busy": a deploy/agent task was in flight at that moment.
6. Sitemap lists `/tag` pages (280) and `/resource` pages; robots allows them; nothing to compare against indexed counts without Search Console.

## (d) R1 connector comparison (versions checked 2026-11-06)

| Source | Option | Read-only possible | Maintained | License | Auth | Credential / console path |
|---|---|---|---|---|---|---|
| GA4 | **Google Analytics MCP** `googleanalytics/google-analytics-mcp`, PyPI `analytics-mcp` **1.1.0** (released 2026-11-06, last push 2026-11-05) | **Yes**: write tools need `--allow-write` + `analytics.edit` | very active, 3.7k stars | Apache-2.0 | ADC with `analytics.readonly` | Viewer access for the identity on the property; `gcloud auth application-default login --scopes=...analytics.readonly` (gcloud not installed here) |
| GA4 | Data API `runReport`, npm `@google-analytics/data` **7.3.0** (2026-10-12) | yes | active | Apache-2.0 | service account JSON | GA4 Admin → Property access management → add SA as Viewer; property id from Admin → Property details. Docs: developers.google.com/analytics/devguides/reporting/data/v1 |
| GA4 | Manual export / Explorations | n/a | n/a | n/a | owner UI | Reports → export CSV |
| Search Console | `searchanalytics.query` (REST, `webmasters.readonly`, 25,000 rows/call) | yes | Google-maintained | n/a | OAuth or SA | Settings → Users and permissions → add SA email as Restricted user. Same API covers URL Inspection and sitemaps. No dedicated official MCP found. |
| Mixpanel | **Official hosted MCP** `mcp.mixpanel.com/mcp` (US/EU/IN) | **No** (read and write); OAuth or service-account bearer (Beta) | vendor-run | n/a | OAuth or SA | Org Settings → Service Accounts |
| Mixpanel | Query/Export REST (SA basic auth); npm `mixpanel` **0.24.0** is an ingestion SDK, not a reader | yes (Analyst/Consumer role) | | MIT | SA user+secret + project id | same path |
| PostHog | **Official hosted MCP** `mcp.posthog.com/mcp` (OAuth; region auto-routed). Old `PostHog/mcp` repo is **archived** (2026-01); npm `@posthog/mcp` **0.25.2** active | scope-limited keys possible, not confirmed from docs | active | MIT (npm) | OAuth / personal key | Settings → Personal API keys |
| PostHog | HogQL `POST /api/projects/:id/query/` with `query:read` | yes | PostHog core active | NOASSERTION | personal API key | as above |
| Amplitude | **Official MCP** `mcp.amplitude.com/mcp`, EU `mcp.eu.amplitude.com/mcp` (OAuth) | role-limited ("Use MCP (read)"), Viewer is read-only; server has write tools | vendor-run | n/a | OAuth | Owner authenticates plugin |
| Amplitude | Dashboard REST / Export API | yes | | | API key + secret | Project settings |
| Replit | none found; UI only | – | – | – | – | Growth/Analytics pane screenshots |

Recommendation: (1) Replit Analytics screenshots now (cheapest, most representative, includes pre-consent traffic). (2) GA4 via Viewer service account + `runReport` (or Google MCP with `analytics.readonly`), pinned `analytics-mcp==1.1.0`. (3) Search Console restricted-user SA. (4) Vendor tools last: consent-gated, <2% of events; if used, prefer REST with a read-only role over write-capable MCPs. Docs: GA MCP README on GitHub, docs.mixpanel.com/docs/mcp, amplitude.com/docs/amplitude-ai/amplitude-mcp, posthog.com/docs/model-context-protocol, developers.google.com/webmaster-tools/v1/searchanalytics/query.

## (e) Data-quality notes

- Consent bias: GA4/Mixpanel/PostHog/Amplitude see only people who accepted; Replit sees pre-consent but a decline stops it. Expect Replit ≥ GA4 on page views and events.
- Suppression: admin, `/qa-*` and `navigator.webdriver` sessions send nothing, so audit lanes add zero to any analytics tool. They do add to the DB (hence the QA skew in (b)).
- Agreement: DB sign-ups (38 in 90d) should roughly match `sign_up_completed` in Replit, lower in vendors. Sitemap count agrees with DB approved count.
- Heuristic limits: test-account regex may misclassify real users with "test" in an address; counts are indicative.
- Not done: no HAR (no browser used); no writes; no secret printed. Replit question unanswered.
