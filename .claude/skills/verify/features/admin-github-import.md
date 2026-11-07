# Admin GitHub import

An admin imports the awesome-video list from GitHub into the catalog. A dry run returns the plan (resources an import would add and update, taxonomy it would create) and writes nothing. A real import adds and updates resources and creates any missing categories.

## Sub-features

- GI-DRY: a dry run through `POST /api/admin/import-github` answers synchronously with the plan and writes nothing.
- GI-COUNTS: catalog, taxonomy and sync-queue counts are identical before and after a dry run.
- GI-QUEUE: the queued `POST /api/github/import` refuses `dryRun` with 400 and names the synchronous route.

## How to get to it (user POV)

- `/admin/github`: `button-import-github` queues a real import through `POST /api/github/import`. It writes, so use it only on a throwaway clone.
- The dry run has no UI. Call the API with an admin session: in the admin page's own context via `evaluate_script` locally, or with `curl` and the owner-authorized cookie on production (`../SKILL.md` Production).

## Driving it with chrome-devtools MCP

Preconditions: an admin session; every `POST` carries `Origin` (a same-origin `fetch` from the page sends it; with `curl` add `-H 'Origin: https://awesome.video'`).

- **Counts before.** Record the length of `GET /api/categories`, `/api/subcategories` and `/api/sub-subcategories` (hyphenated), the `total` of `GET /api/github/sync-status`, and the body of `GET /api/admin/stats`.
- **Dry run.** `POST /api/admin/import-github` with `{"repoUrl":"https://github.com/krzemienski/awesome-video","dryRun":true}`. Expect 200 within about 15 s, `dryRun:true`, a `message` that ends "Nothing was written.", and an empty `wouldCreateTaxonomy` when the taxonomy is in sync.
- **Counts after.** Repeat the reads from the first step. Every count must match. The server caches the three taxonomy GETs for 60 s, so reread those more than 60 s after the dry run.
- **Queue refusal.** `POST /api/github/import` with the queued route's own body shape, `{"repositoryUrl":"krzemienski/awesome-video","options":{"dryRun":true}}`. Expect 400 with the message "Dry runs are not queued. Use POST /api/admin/import-github with dryRun: true, which returns the plan synchronously." The dry run's body (`repoUrl`) is the wrong shape here: it fails earlier with 400 "Repository URL is required", which proves nothing about the refusal.

## Gotchas

- The request is synchronous and can take about 15 s. Wait for the response; do not retry while it runs.
- The admin tab's button runs the queued real import, not a dry run.
