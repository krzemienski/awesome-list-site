# Production confirmation of F01–F13 (reseed, export, link-health, GitHub admin) on https://awesome.video

**Run:** 2026-10-11, 03:45–03:55 UTC. Read-only. Owner admin sign-in (`POST /api/auth/admin-login` with OWNER_PASSWORD), GET requests and admin page loads, then `admin-logout`. In the browser every non-GET `/api` request from the page was aborted and recorded; the only ones were 4 × `POST /api/send` (the platform-injected widget beacon), all aborted. Not invoked: reseed, seed, canonicalize-tags, `POST /api/admin/check-links`, `POST /api/admin/link-health/run`, any job cancel, any GitHub pull/sync/export, and no downloads.

**Revision live:** `/api/version` → `b051a2e4`. The final F01–F13 commit is an ancestor (`git merge-base --is-ancestor a26b0235 b051a2e4` succeeds). Server-behaviour markers agree (see the GitHub sync-status shape below), so this is not just the version string.

Scripts and raw outputs: `evidence-605/` (`api-probe.mjs`, `admin-ui.mjs`, `bundle-strings.mjs` and `*-out.*`, `f10-route-probe.txt`). Screenshots (opened and viewed): `evidence-605/shots/` (export, linkhealth, github, database at 1440 and 390 px, dark).

## Done criteria

| Criterion | Production result | Verdict |
|---|---|---|
| /admin/export JSON card says "Non-restorable catalog snapshot" | JSON Snapshot card: "Non-restorable catalog snapshot, not a full database backup. Includes resources, category hierarchy, tags, learning journeys, sync queue and limited user summaries. Omits user identities, favorites, bookmarks, contributions, audit history, AI jobs and discoveries, notification preferences and other application state." Same at 1440 and 390 px. | **PASS** |
| No SQL-dump / API-token controls | With every `<details>` opened, page text has neither "SQL dump" nor "API token". Export-area buttons: Run Validation, Run Link Check, Download ×3 (JSON/CSV/OPML), Generate (README.md), Previous, Next. The old toast copy "No supported admin endpoint…" is in none of the 131 production JS chunks. | **PASS** |
| CSV and OPML rows in Export history | Table rows (1440 and 390): `Category tree · opml · 3,824` (`categories.exported`), `Awesome list · markdown · 3,824`, `Resources · csv · 4,038` (`resources.exported`), `Catalog snapshot · json · 4,038`, all Oct 9 2026 04:17. API: `GET /api/admin/audit-logs?limit=50` has these 4 export rows (ids 27232–27235); last 500 audit rows hold 10 of each export action. | **PASS** |
| `GET /api/admin/link-health/status` returns the job with status/error fields | 200, job #8 `completed`, 3,823/3,823; job keys `id,status,totalLinks,checkedLinks,healthy/broken/redirect/timeout/suspectLinks,startedAt,completedAt,createdAt`. `errorMessage` is omitted when null by design. History shows terminal reasons: #7 and #6 `failed` "Interrupted by server restart". No job is running, so no live cancel state exists to show. | **PASS** |
| `GET /api/github/sync-status` returns partial outcome + errorMessages | 200, 49 items. Item keys now include `importResult` (pre-F13 shape had no such key). All 22 terminal imports carry `importResult {imported, updated, skipped, errors, errorMessages[]}` (e.g. #4 `241/557/0/0, []`). 0 partial imports exist in production, so no row has `status: "partial"`. `/api/github/sync-history` rows carry `errorMessages` too. | **PASS** (fields live; no partial data in prod) |
| Export tab renders the link-check job panel; check-links not invoked | `[data-testid=export-link-check-job]`: "Link check #8 COMPLETED · Checks the stored URL of every approved resource — the same URLs the exports write. Completed Aug 5, 2026, 12:18 AM: 3,809 healthy, 12 broken, 0 redirects, 0 timeouts, 2 suspect of 3,823. Open Link Health for problem links". Run Link Check button present, not clicked. | **PASS** |

## Other items (checked read-only)

- **F01/F02 (reseed/seed result panels):** /admin/database renders "Seed Database" and "Clear & Re-seed" (not clicked). The production admin chunk contains `seed-result-failed`, `seed-result-partial` and "Seeding partially failed". The atomic-rollback behaviour can only be shown by running a reseed, which this task rules out.
- **F06 (canonicalize cache refresh):** needs a write. Not checked.
- **F07/F10 (single active scan, cancel):** the cancel route exists in production: anonymous `DELETE /api/admin/link-health/jobs/999999999` → 401, against 404 for an unknown `/api/admin/*` path (`f10-route-probe.txt`). The chunk contains "Cancel running scan". Starting a scan to test it is out of scope.
- **F08/F09:** the chunk contains "Link health data could not be refreshed" and "Counts and problem links below are from the previous completed scan". /admin/linkhealth: no alerts, no "No link health data" copy. The latest job completed, so no failure banner is expected.
- **F12 (polling only while active):** with no pending or processing job, /admin/github made exactly one `/api/github/sync-status` request in a 9 s idle window at each viewport, so polling is off in the terminal state.
- **F13 UI:** the chunk contains "Failed items (". There are no partial imports to render.
- No API response ≥ 400 and no page errors on any of the four admin pages at either viewport.

## Observation (not a regression)

The Link Health dashboard shows **Broken 11**, but the job #8 summary on the Export panel says **12 broken**. The likely cause: the dashboard reads the persisted problem checks, while the job summary is the counter saved when the scan finished in August, so a flagged resource removed or rejected since then drops out of one but not the other. This was not traced further. A fresh scan would bring them back in line. Starting one was out of scope here.

## Not yet published

Commits after `b051a2e4` (full database backup panel, AI job status fixes, header decision) are not live. That explains why the JSON card does not yet end with "For a restorable copy, use Full database backup below." That sentence comes from the unpublished backup work, not from F03.
