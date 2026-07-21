---
name: Dev server has no hot-reload
description: Why code edits may appear to "not take effect" when testing via curl/API
---

The dev workflow runs `NODE_ENV=development tsx server/index.ts` with **no watch flag**.

**Rule:** After editing any server-side file, explicitly restart the "Start application" workflow before testing the change via API/curl. Do not trust that an edit is live.

**Why:** tsx without `--watch` does not reload on file changes. The platform's "workflow auto-restarts after edits" is not always immediate/reliable, so a curl test run right after an edit can hit the OLD compiled code and produce confusing results (e.g. a fix that looks like it did nothing, an endpoint still 500ing).

**How to apply:** Edit server file → `restart_workflow("Start application")` → then run the API test. If a fix "didn't work," restart and retest before assuming the fix is wrong.

Also: `/tmp/logs/Start_application_*.log` files are snapshots written only when logs are refreshed — after a workflow restart, grepping the newest existing file reads PRE-restart output. Refresh logs first, then grep the newly written file.

Flip side (client): vite triggers a **full page reload on ANY workspace file write** — even non-code files like `evidence/*.md`. Any open Playwright/browser probe gets ERR_ABORTED/interrupted navigation. **How to apply:** write probe outputs to `/tmp` first, copy into the workspace after the browser session closes; also note workspace-run Node scripts resolve `node_modules` only from the project root (a `/tmp/*.mjs` script can't `import 'playwright'` — copy it into the root, run, delete).
