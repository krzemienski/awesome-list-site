# Task 583 completion gates (2026-10-09)

- `npm run check` (tsc): passed after the final edit.
- Integration tests, run serially: `npx vitest run tests/integration/api/admin.test.ts tests/integration/api/categories.test.ts tests/integration/api/resources.test.ts --no-file-parallelism`: 3 files, 134 tests passed. The first run caught 2 regressions from this task: the reject message dropped "minimum 10 characters", and a short admin description on a published row was being replaced. Both were fixed, and every API and browser proof was re-run afterwards.
- Unit tests: `npx vitest run tests/unit --no-file-parallelism`: 324/325 passed. The one failure, `tests/unit/sidebar-ux-css.test.ts` (it expects `aria-expanded=` on the sidebar expand-sub button), is in sidebar code this task does not touch.
- Design-system verification: `node .agents/skills/awesome-ds-verify/scripts/verify-ds.mjs --mode full --routes /,/category/encoding-codecs,/resource/184767`, run id `2026-10-09T16-30-58-384Z-4265`. Verdict INCOMPLETE: 16 pass, 0 block, 0 fix, 2 unverified. The 2 unverified gates (parity-systems, pixel-parity) belong to the deep tier and only run with --deep. /admin is covered by the authenticated `ds-button-sweep` and `ink-accent` gates, which both passed. The category live-probe captures for Editorial and Brutalist were opened: two deliberately different skins, nothing broken.
- Workflow "Start application" restarted cleanly after the last server edit and served every proof.

## Project validation run (2026-10-09 ~16:40 UTC)
Fixed in this task:
- `openapi-drift`: docs/api/openapi.yaml regenerated (`npx tsx scripts/export-openapi-yaml.ts`); the gate now passes with 182 routes and 182 contracts.
- `dead-exports`: removed the unneeded `export` on `invalidateCatalogQueries`, which came from this task's area.

Still failing. Each fails the same way when re-run on its own (serially, 16:50–17:05 UTC), and each sits outside the files this task changed:
- `collections-audit` library:state-rendered tag=false (Library personal tags)
- `print-audit` journey-anon:login-inline-visible (journey page)
- `seo-snapshot` /journey/10: step descriptions differ between crawler and client
- `sticky-preview-audit` theme-sticky-preview-scroll@768 (/settings/theme)
- `tablet-audit` sidebar-drawer@768 and theme-preview-text
- `responsive-audit` tabs-profile-1440 (profile tabs)
- `dead-exports` client/src/lib/route-monitor.ts#reportDeadLink (from the 13:29 publish)
- `root-script-drift` scripts/run-ds.sh and scripts/setup-ds-run.sh (from the design-system adoption commit)
- `ds-button-sweep` / `design-system-showcase`: Clerk UI sign-in, bookmark-card visibility and the browser lease timed out while ~30 gates ran in parallel
