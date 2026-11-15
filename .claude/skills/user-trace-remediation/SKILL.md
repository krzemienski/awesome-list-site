---
name: user-trace-remediation
description: 'Cross-source user trace for awesome.video that joins the admin logs sink, traffic_hourly, member usage, operations health, job histories, PostHog (events, web vitals, exceptions, replays) and post-run audit docs. Use when the user asks to trace user journeys, "what are users hitting", "trace across PostHog and the logs", "postdocs", cross-location or cross-source analysis, user friction, drop-offs, error spikes or web-vitals regressions, or wants trace findings fed into the bug inventory before a remediation run.'
model: inherit
---

# Trace what awesome.video users actually hit, and feed the fix queue

The goal is one artifact: `user-trace-report.md`, where every finding names the users it touches, the sources that agree on it, and one testable remediation row ready for the master bug inventory.

Run on demand only. The trace is read-only: it writes nothing to production and never schedules itself, adds a monitor, a cron or a CI job (owner rule, 2026-11-07).

## How the sources fit

- No single source sees everything. The server sees every request but not what rendered. PostHog sees the browser, but only after consent, and never for automated browsers (`navigator.webdriver`), admin sessions carrying the `analytics-admin-session` marker, `/qa-*` paths or non-production hosts (`client/src/lib/analytics-suppression.ts`). A finding is strong when two independent sources agree.
- Audit traffic pollutes both sides. Server counts include it. PostHog mostly drops it, yet sessions whose `distinct_id` starts `qa-audit-` reached replay on 2026-11-15. Split by class (`real`/`test`, `human`/`bot`) or by QA time window before counting.
- Empty is a result. Zero `$exception` rows while audit browsers are suppressed says little; zero human 5xx in `traffic_hourly` says a lot. Say which kind each empty result is.
- Post-run docs are claims. A ledger row marked fixed stays a hypothesis until a live source shows the symptom gone on the live revision.

## Prerequisites

1. Owner admin header: `curl -s -o /dev/null -w '%{http_code}' -H @"$HOME/.cache/awesome-audit/owner.hdr" https://awesome.video/api/admin/stats` prints 200. On 401, hand the owner `! bash ~/.cache/awesome-audit/refresh-owner.sh` before starting. The file is a credential: pass it with `-H @file`, never print it.
2. PostHog MCP: `mcp__plugin_posthog_posthog__exec` with `call project-get {}` returns project 109428 (app url https://awesome.video). Run `info <tool>` once before the first `call`, and pass a `context` string on every call. Never copy the project API token from the response. Without the MCP, mark every PostHog row UNVERIFIED and continue.
3. Live revision: `curl -s https://awesome.video/api/version`. Every record and finding carries this SHA.

## Steps

Write outputs under `.local/audit/<RUN_UTC>/trace/` (gitignored): one raw file per source, then `user-trace-report.md`. Each finding cites the file and the exact query behind it.

### 1. Collect and normalize

Pull one window per source (default 7 days for logs, 28 days for counts). Normalize to UTC ISO time, route templates (`/resource/:id`), and `{time, source, template, class, status_class, revision, count}`.

| Source | Read | Traps |
|---|---|---|
| Server logs | `GET /api/admin/logs?since=-7d&level=warn&limit=2000` | Entries are `.records`. A truncated page carries `nextUntil`: repeat with `until=<nextUntil>` until it is absent, or counts read as a false 0. Fields `_time, level, area, instance, message`; request lines carry `rid` and `req`. |
| Document traffic | `GET /api/admin/traffic?days=28` | `totals[]` by template x class x statusClass, `series[]` by day. |
| Member usage | `GET /api/admin/usage` | `real`/`test` split, windows w28/w90/all. Read its `notes` before comparing windows. |
| Operations | `GET /api/admin/operations/health` | Point reading of DB pool and public cache; record the time. |
| Jobs | `/api/admin/link-health/status`, `/api/enrichment/jobs?limit=20`, `/api/researcher/jobs?limit=20`, `/api/github/sync-status`, `/api/admin/database-backups` | Failed or interrupted jobs with `createdAt`. |
| PostHog events | `call execute-sql` | Time bound in `WHERE timestamp`; select named properties, never whole `properties`. Start with counts by event for 7 and 28 days and the `$lib_version` split. |
| Web vitals | `call query-web-vitals`, one metric per call (LCP, INP, CLS, FCP), p75 | INP and CLS arrive only on page hide, so per-metric counts differ. |
| Exceptions | `call query-error-tracking-issues-list` plus a SQL count of `$exception` | |
| Replays | `call query-session-recordings-list {"date_from":"-7d","filter_test_accounts":true}` | The project test filter excludes only localhost; check `distinct_id` prefixes for audit sessions. Report counts, never ids. |
| Post-run docs | `docs/production-state-*.md`, `docs/history/reports/**`, `docs/history/audit/**`, `.local/audit/**/ledger.md` | Record each item's claimed status and whether the claim cites live evidence on a named revision. |

GA4, Search Console, Mixpanel, Amplitude and the Replit Analytics UI need credentials this repo does not hold. List each as `not reachable: <reason>`.

Done when every source row has a raw file or a `not reachable` line, and the log pages ran to the end.

### 2. Reconstruct the user experience

- Visitors: templates with real human traffic; templates answering 4xx or 5xx to humans; LCP/INP/CLS p75 on the top templates; search dead ends (`search_performed` with no `resource_viewed` after); outbound clicks (`resource_link_opened`).
- Members: sign-in volume; pageview to sign-up to first bookmark or collection; features with zero real use in 28 days.
- Admins: failed jobs, error records by `area`, shed or slow requests.
- Per revision: error records per live SHA. A spike starting at a deploy names that deploy.

Done when each audience has numbers from at least one source, or a stated reason it has none.

### 3. Map dependencies

List what each journey rests on: Neon Postgres pool, `publicCache` and the catalog fingerprint stamp, SSR and `server/og-middleware.ts`, the Clerk proxy `/api/__clerk`, external resource URLs, the Anthropic router (`server/ai/anthropicConfig.ts`), the Replit Autoscale edge. A user-visible error with no app log record but a Google Frontend status points at the edge, not the code.

Done when every journey from step 2 has its dependency list.

### 4. Trace across sources

Join on time window, template and revision:

- PostHog vitals or `site_error` spike on a template, then `traffic_hourly` for that template and hour, then `/api/admin/logs` records in that hour (`rid`, `inst`), then the post-run doc that last touched that code.
- A post-run "fixed on X" claim, then the symptom's query on the live revision: confirmed, regressed, or never reproduced.

Done when every candidate finding carries its agreement count (1, 2, 3+ independent sources).

### 5. Synthesize findings

One record per finding:

| Field | Content |
|---|---|
| End-user activity | who, doing what, how many real users or sessions |
| Dependencies | from step 3 |
| Trace path | source to source, each with its query |
| Finding + evidence | the observed fact, file path, revision |
| Remediation | one testable change or operational action, plus the check that proves it |

Findings resting only on audit traffic or only on an unverified doc claim go under "Not confirmed" with the reason. Done when every candidate is either a record or a "Not confirmed" line.

### 6. Generate remediation items

One row per confirmed finding, in the inventory schema:

`| ID | Bug Description | Source Session(s) / Trace / Audit | Status Claimed | Verified in Production? | Notes |`

Use `T-NNN` ids; the inventory owner renumbers to `B-NNN`. Severity: P0 production-breaking, 5xx, auth bypass or data integrity; P1 a broken core flow or an item recurring across runs; P2 degraded UX, CLS, a11y or an edge case with a workaround; P3 cosmetic. Raise one level when trace volume is high. Items only the owner can act on (a dashboard toggle, an edge setting) go in an Owner Action table with the reproduction and one step.

Done when every confirmed finding has exactly one row.

### 7. Align to the pillars

Tag every row with one pillar and a measurable target:

1. Catalog discovery and navigation (home, taxonomy, search, tags): 0 human 5xx on browse templates; search dead-end rate.
2. Resource integrity and outbound value (detail pages, link health, related items): resource LCP p75 under 2.5 s; broken-link count.
3. Crawlability, SSR and performance (meta, JSON-LD, sitemap, vitals, cache resilience): CLS p75 under 0.1 on every top template.
4. Frictionless auth, library and learning (Clerk, bookmarks, collections, journeys): 0 sign-in error records; funnel step conversion.
5. Contributions and admin operations (submit, approvals, AI jobs, backups, observability): 0 unexplained failed jobs.

Done when no row lacks a pillar and a target with its current value.

### 8. Report

`user-trace-report.md` holds, in order: Findings Report (step 5, strongest agreement first), Dependency Map (step 3), Remediation Action Items (step 6 plus the Owner Action table), Pillars Alignment (pillar, items, target, current value). It opens with:

```
Trace <window> on <revision short>: COMPLETE | PARTIAL
- Sources read: logs (<n> records, <pages> pages), traffic (<days> d), usage, ops health (<UTC>), jobs, PostHog (<events> events), docs (<n> files)
- Not reachable: <source>: <reason>
- Findings: <n> confirmed (<k> with 2+ sources), <m> not confirmed
- Items: P0 <a>, P1 <b>, P2 <c>, P3 <d>; owner action <e>
- UNVERIFIED: anything not queried
```

COMPLETE requires every reachable source read in full; anything less is PARTIAL with the gap named.
