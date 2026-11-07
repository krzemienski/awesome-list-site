# Lane rules: prod-ops 2026-11-07 (orchestrator-written)

Goal: find which awesome.video functions real visitors, members and the owner depend on, using real use of the live site, analytics and production logs. Feed one approval package (APPROVAL.md) that the owner approves line by line. Phases 1-3 are **read-only discovery**. Code changes, deploys, PostHog writes and production writes outside QA rows all wait for the owner's written approval.

## Paths
- WT (worktree, run every command here): `/Users/nick/Desktop/awesome-list-site/.claude/worktrees/prod-ops-1107`
- R (run root): `WT/reports/prod-ops-2026-11-07/`. Your file is `R/lanes/<lane>.md`. It holds your narrative and checkpoint; update it after every function or batch. Nobody else writes it.
- Evidence (gitignored): `WT/e2e-evidence/prod-ops-2026-11-07/<lane>/`. Use absolute paths (relative HAR paths were lost last run).
- The orchestrator alone writes PROGRESS.md, APPROVAL.md and DECISIONS.md.

## Prior work: build on it, don't redo it
- **07b pass** (this morning, same mission, revision 60e07dcf; it stopped before an APPROVAL): `/Users/nick/Desktop/awesome-list-site/.claude/worktrees/prod-primary/reports/prod-primary-2026-11-07b/`. Read `PROGRESS.md` and the lane files `lanes/*.md` and `lanes/*.findings.jsonl`. Also `lanes/codemap.md` (95 functions) and `lanes/safety.md` (write rulings W-*).
- **11-06 prod-ops pass**: `WT/reports/prod-ops-2026-11-06/lanes/` and `evidence/lead/`.
- The live revision is now **1cd25ab06e344b1db198857910a95486efe36082**, published 2026-11-07T18:52:55Z, booted 18:52:43Z. Versus 60e07dcf, the only app change is a dev-only CSP line in `server/index.ts`. So 07b results carry over as *prior evidence*; you re-check a sample on 1cd25ab0 and spend your effort on 07b's FAIL, UNVERIFIED and NOT-RUN cells and on gaps. Stamp every result with the revision you saw at `/api/version`.

## Result per function
Record for each function: the steps, the result (works, broken or degraded), console errors, failed network calls, and evidence (screenshot path you actually opened, plus a HAR or network excerpt). Owner rule: **a reason is not a result**. "NOT-RUN because X" never counts as done. When something can't be run the obvious way, find another way (fetch-delay injection for loading states, CDP throttling, a QA row, a different viewport) and record what you tried. Only a genuine owner-only blocker (a credential, money, an irreversible production write) may stay open. State it as a question for the owner, with the exact unblock step.

Viewports: 390x844, 768x1024, 1280x900, plus keyboard-only navigation for the core flows.

## Browser
- Use agent-browser with `AGENT_BROWSER_SESSION=po1107-<lane>-<n>` as an env var. One open session per lane at a time. Close only your own sessions, never `--all`.
- Do NOT use the chrome-devtools MCP: it is attached to the owner's own Chrome.
- Traps: headless never scrolls (use a tall viewport or a DOM click for below-fold targets). Wait about 2500 ms after networkidle. Re-snapshot refs after each navigation. Radix menus and selects need a ref click, not DOM `.click()`. `navigator.webdriver` is true, which suppresses analytics SDKs.
- **Paid-call guard (mandatory for any signed-in page)**: route-abort `POST /api/recommendations*` before loading Home or /profile signed in. Signed-in Home and /profile auto-fire a paid Claude call (07b BUG-t-member-account-1). Count any that escaped.

## Sessions
- Audit admin state: `~/.cache/awesome-audit/pp7b-audit-admin.state.json`. Audit member state: `~/.cache/awesome-audit/pp7b-member.state.json`. Load them read-only (`--state <file>`); never save over them.
- Check a session only by status code, or by `/api/auth/user` role, fetched inside the page.
- Never print, cat or echo anything in `~/.cache/awesome-audit/`, `.env`, cookies, tokens or request headers. Never run `agent-browser cookies get`. Pipe network listings through `sed 's/?.*//'`. If a secret reaches your transcript, say so in your final message.
- Never sign out any session. Never click "Sign out" or "Sign out all devices". Never visit logout, admin-logout or logout-all.

## Production write safety (binding)
- Forbidden on production (stop-validating.md group 4 and more):
  - sign-out of shared sessions
  - seed or re-seed, or any database restore
  - real user role changes or deletes
  - GitHub import or export confirm
  - deleting or editing any row not prefixed `qa-audit-20261107c-`
  - approving or rejecting real submissions
  - link-health remediation apply, or the full link scan
  - sending a digest
  - direct DB writes
  - `publish_app` and `update_app_using_prompt`
  - any PostHog write
- Paid actions (researcher launch, enrichment run, AI edit analysis, recommendations, Replit `ask_question`): budget is zero. Drive up to the confirm, cancel, and record the paid step as an owner budget question.
- QA rows: titles `qa-audit-20261107c-<lane>-<n>`. URLs `https://awesome.video/qa-audit-20261107c/<lane>-<n>` (production rejects example.com; catalog-contributions.ts isReservedTestHost). Writes are allowed only under a 07b `safety.md` ruling marked ALLOWED or CONDITIONAL, with its conditions met. Create, test and undo within one step. Read back absence from the API, `/sitemap.xml` and search. Log every write in your lane file with how it was undone.
- Every admin non-GET carries `Origin: https://awesome.video`.
- Hidden writes to count, not hide: 404 pages POST dead-link telemetry; a signed-in visit to `/resource/:id` POSTs a view interaction.
- Load: at most one browser context per lane. No parallel crawls. Sitemap sampling is at most 30 URLs.

## Code and shell
- No helper script files (.sh/.js/.py) anywhere. One-off curl or jq pipelines are fine.
- The shell is zsh: quote expansions; never use `path`, `status` or `prompt` as variable names; quote any word starting with `=`.
- Read a file before claiming anything about it, and cite file:line. No commits, pushes, PRs or deploys.

## Final message (to the lead, under 400 words)
Lead with the outcome. If a Primary function is down for real visitors, say so in the first line. Then give counts (works/broken/degraded/open-with-unblock-step), the top findings with evidence paths, QA writes and their read-backs, the non-GET table, and any secret exposure.
