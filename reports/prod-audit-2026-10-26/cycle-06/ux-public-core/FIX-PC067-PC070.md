Fix C6-PC-067 through C6-PC-070 in awesome-list-site. Work only in an isolated /tmp clone from origin/main 520d6778369bc7ce495204cfcacc7e0533f941cc on branch fix/c6-pc067-taxonomy-recovery. Never edit the stale main checkout and never merge/deploy.

Read reports/prod-audit-2026-10-26/cycle-06/ux-public-core/findings.md and inspect its cited evidence. Scope is TaxonomyListing and directly reused card/pagination primitives only:
- PC-067: Grid cards must expose the same Favorite and Bookmark actions as List and Compact, with working guest/member states and no duplicate stretched-link/focus behavior.
- PC-068: clearing the collection search input must remove search from URL/state, trigger the unfiltered request, restore counts and expose the same removable-chip semantics as other filter removal paths.
- PC-069: typed and direct out-of-range pages must clamp to totalPages with a dismissible explanatory notice and recovered listing, never silent clamp or generic 404. Preserve nonnumeric inline validation.
- PC-070: automatic offline→online recovery must move focus to meaningful recovered content (H1 or results region) without focus theft during ordinary background refetches.

Reuse existing patterns; do not change analytics event names or API contracts. Run tsc --noEmit and npm run build with unpiped exit codes. Drive the real local UI in Chrome at 1440x900, 820x1180 touch and 390x844 touch for all four fixes, including guest grid/list/compact actions, cleared search request/URL/chip, typed and direct overflow recovery, and keyboard focus after real offline/reconnect. Save screenshots and accessibility snapshots under reports/prod-audit-2026-10-26/cycle-06/ux-public-core/fix-pc067-pc070/. No test files or validation scripts/harnesses.

Commit with a conventional fix message, push HEAD to fix/c6-pc067-taxonomy-recovery, open a non-draft PR to main, and return PR number, head SHA, changed files, exact checks/evidence and remaining UNVERIFIED items. Never merge.