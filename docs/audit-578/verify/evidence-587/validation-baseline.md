# Completion validation: failures traced to the pre-task baseline (2026-10-09)

## Fixed in this task
The first completion run (`xpjDZUy7YzzMrLasazScn`) failed three gates. Each was fixed and now passes when rerun:
- **openapi-drift.** `docs/api/openapi.yaml` was stale because of contract changes already on main. Regenerated with `npx tsx scripts/export-openapi-yaml.ts`.
- **dead-exports.**
  - `reportDeadLink` is no longer exported.
  - The theme failure toast now uses `useToast()`. The vendored `toast` export stays pinned and unused.
  - The unused `invalidateCatalogQueries` export was also dropped.
- **root-script-drift.** The finished design-system launch helpers `run-ds.sh` and `setup-ds-run.sh` moved to `scripts/archive/`.

## Pre-existing and outside this task
Method: a worktree at `c58c3a4f`, the main commit right before this task's commit, served by its own dev server on port 5101 (`DISABLE_BACKGROUND_JOBS=1`). The same audits were run against it with `AUDIT_BASE_URL=http://127.0.0.1:5101`.

| Gate | Failure on this task's tree | Same failure on the pre-task baseline? |
|---|---|---|
| tablet-audit | sidebar-drawer@768; theme-preview-text minFont=10.5px | yes, both identical |
| responsive-audit | tabs-profile-1440 radius=0px | yes |
| sticky-preview-audit | theme-sticky-preview-scroll@768 | yes |
| print-audit | journey-anon:login-inline-visible | yes |
| seo-snapshot --parity | /journey/10 step descriptions: the crawler appends "Some resources in this step are no longer available." to the step description, while the client shows that note in a separate paragraph | yes. Script `j10.mjs` gives the identical diff on the baseline. The code is in og-middleware's journey section (from the 13:29 publish), which the journeys task owns |
| collections-audit | library:state-rendered tag=false (the bookmark collection tag text) | not reproducible on the baseline, because Clerk sign-in does not work on port 5101. None of this task's files render bookmarks or collections |

None of these surfaces (sidebar, profile tabs, theme preview typography and sticky layout, journey print/login, the journey crawler, collection tags) are touched by this task's diff.
