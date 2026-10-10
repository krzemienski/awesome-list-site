# Completion-validation failures that predate this task (2026-10-09)

The completion validation run reported 9 failing commands. Each one was checked against the state of the code **before** this task's changes. To do that, this task's `client/` diff was reverse-applied on the running DEV app (`git diff HEAD~1 -- client | git apply -R`), each audit was rerun, and then the diff was re-applied (verified: `git status client` clean against HEAD).

| Command | Failure | Before this task's changes | Owner |
|---|---|---|---|
| tablet-audit | `sidebar-drawer@768` sidebarVisible=false; `theme-preview-text` minFont 10.5px | **same 2 FAILs** | pre-existing |
| responsive-audit | `tabs-profile-1440` radius=0px | **same FAIL** | pre-existing |
| sticky-preview-audit | `theme-sticky-preview-scroll@768` | **same FAIL** | pre-existing |
| collections-audit | `library:state-rendered` tag=false | **same FAIL** | pre-existing |
| print-audit | `journey-anon:login-inline-visible` | **same FAIL** | pre-existing |
| dead-exports | `queryClient.ts#invalidateCatalogQueries`, `route-monitor.ts#reportDeadLink` | files last changed by the 13:29 publish; this task does not touch them | pre-existing |
| root-script-drift | `scripts/run-ds.sh`, `scripts/setup-ds-run.sh` stray | added by the 2026-10-09 02:43 design adoption | pre-existing |
| validate:openapi | OpenAPI/runtime contract drift | server routes; this task changes no server code | pre-existing |
| seo-snapshot --parity | `/journey/10` step descriptions crawler vs client | journey SSR; not touched | pre-existing |

The design-system gates this task owns all pass in the same validation run: palette-drift, standalone-palette-drift, accent-drift, canonical-token-parity, ds-showcase, theme-registry-types, font-prepaint, product-profile-browser, dead-components, `npm run check` and build-dist.
