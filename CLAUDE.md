# awesome-list-site — Claude Code Configuration

## Rules

- Do what has been asked; nothing more, nothing less
- NEVER create files unless absolutely necessary — prefer editing existing files
- NEVER create documentation files unless explicitly requested
- NEVER save working files or tests to the repo root — use the existing directories (`client/`, `server/`, `shared/`, `scripts/`, `tests/`, `docs/`)
- ALWAYS read a file before editing it
- NEVER commit secrets, credentials, or .env files
- NEVER add a `Co-Authored-By` trailer to user commits unless this project's `.claude/settings.json` has `attribution.commit` set. The Claude Code Bash tool may suggest one in its default commit-message template — ignore it. `Co-Authored-By` is semantic authorship attribution under git/GitHub convention; the tool is the facilitator, not a co-author.
- Keep files under 500 lines
- Validate input at system boundaries

## Build & Test

- There are no test suites (owner rule, removed in b4040bfe; see replit.md). Verify changes in the real running app and API.
- ALWAYS verify build succeeds before committing

```bash
npm run build
```

Gates per change: `npm run build` (it runs `tsc --noEmit` before bundling) and `npx eslint <touched files>` with no new errors. Whole-repo `eslint .` fails on ~4.4k pre-existing type-strictness errors (and on gitignored `.claude/worktrees`), so lint only what you touch.

### Rule table

Each rule names what enforces it. When a correction repeats a rule whose enforcer says "nothing", raise it to a check in the same change.

| Rule | Enforced by |
|---|---|
| Code that fails the typecheck never ships. esbuild strips types, so a missing method used to bundle cleanly and crash at runtime. | `tsc --noEmit` inside `npm run build`, which `scripts/publish-build.sh` runs |
| The nav tree has one producer (`HomeNavRepository`) and one type (`shared/catalog-nav.ts`). Every node carries `totalResourceCount`: display it, never re-sum. Corpus-tree counts and the non-category README names come only from `shared/catalog-counts.ts` (`corpusTotalCount`, `countNestedGroups`, `isRealCategory`). | `tsc` (producer and consumers share `CatalogNav`; nav nodes have no `resources`) |
| User rows leave the API only through the `sanitizeUser` whitelist (`server/validation/inputs.ts`), never as raw `User` objects with `password`. | Nothing automatic: both user routes use it today. Treat a new user-returning route as a review item |
| URLs (with or without `https://`, also `--url=`) containing `?`, `*` or `==` in `curl`/`wget` commands are quoted (single quotes preferred). | `~/.claude/hooks/awesome-list-site/url-quote-guard.py` (Claude Code user hook) |
| A review pin (`pr=<N> sha=<sha> agent=<reviewer's agent id>`, in the review worktree's git dir) for an open PR blocks `SendMessage` only for its owner (`agent_id` equals `agent=`) and for a subagent whose cwd is inside that worktree, and only while the worktree `HEAD`, the pin and the PR `headRefOid` are not the same commit. The lead (no `agent_id`), a headless run and every other agent are never blocked, so a stale pin cannot stop anyone else from reporting; the owner re-pins to the new head or clears it with `git worktree remove --force <worktree>`. Reviewers never call EnterWorktree and use a unique `review-<N>-<sha8>-<UTC stamp>` path; the hook scans all review worktrees from the hook cwd's checkout, or from the main checkout when the cwd is outside the repo. | `~/.claude/hooks/awesome-list-site/review-pin-guard.py` (Claude Code user hook) |
| `gh pr merge` (any `-R`/`GH_REPO`, also inside `sh -c`, `eval`, `xargs`, behind `env`/`timeout`/`nohup`, and after a `cd`), a PUT to `…/pulls/<N>/merge` and a GraphQL merge mutation run only with every review thread resolved and a `VERDICT: APPROVE <sha>` comment naming `headRefOid` that is at least 60 s old. | `~/.claude/hooks/awesome-list-site/merge-guard.py` (Claude Code user hook) |

## Shell

- The shell is zsh. For loops, probes and anything with control flow, run `bash -c '…'` or `python3 -c '…'` inline instead of zsh syntax.
- Quote every URL that contains `?`, `*` or `==`: `curl -s 'https://awesome.video/api/resources?page=2'`.
- Never rely on unquoted `$VAR` word-splitting; use arrays (`args=(--flag value); cmd "${args[@]}"`).
- Never name a variable `path`, `status` or `prompt` (zsh special variables).

## Browser QA

- `agent-browser` on system Chrome is the default driver. The chrome-devtools MCP gets at most one try with a 10 s timeout. Never report BLOCKED for driver reasons: switch driver and continue.
- Use real pointer clicks and key presses. A DOM `.click()` is allowed only for below-fold targets that headless cannot scroll to, and the evidence must label it.
- Dismiss overlays and wait for `#ssr-seo-hold` to be gone and `#root` to have children before interacting.
- Set the viewport, then assert `window.innerWidth` before capturing evidence. Use tall viewports for pagers and footers.
- Retry Radix radio groups with a held key before grading them.
- Override `navigator.webdriver` only when judging analytics. Touch-emulation gaps are caveats, not failures.
- On a daemon "os error 35", kill the daemon by PID and restart it.
- Lane procedure: `.claude/skills/qa-lane/SKILL.md`.

## Code Review

- Review in a dedicated worktree at the PR head SHA and record that SHA. Re-check `headRefOid` right before the verdict; if it moved, re-verify the delta. The verdict names its SHA. Procedure: `.claude/skills/review-pr/SKILL.md`.
- Read every review thread before merging.
- Run TypeScript probes with `npx --yes vite-node@6.0.0`, not plain `tsx`. macOS `/tmp` is `/private/tmp`.
- Compare touched-file eslint against the base commit, not against zero.
- When local `main` is behind, read files with `git show origin/main:<path>`.

## Safety

- Respect hook blocks: report the block and ask. Never route around one.
- Never print cookies, tokens or full emails.
- QA rows are created only as the audit admin or audit member. `/api/admin/qa-rows` deletes three row types (resources, resource edits, bookmark collections); clean those up through it within 10 minutes of a fresh backup (see `.claude/skills/defect-loop/SKILL.md`). Side effects of allowed QA writes that no path can delete are expected, never forbidden, and the run report lists them: audit-log rows and signed-in `user_interactions` view rows. No QA actor creates API keys, journey enrollments, onboarding progress, bookmarks without a cleanup step, or sign-ups other than a throwaway `@example.com` address stopped at the code screen. Member lanes browse `/resource/:id` signed out unless the row needs sign-in.

## Agent messaging

- A `SendMessage` report is at most 5 lines: verdict, SHA, PASS/FAIL/NEEDS_YOU counts, evidence path. Full detail goes in the result JSON on disk.

## Production QA conventions

- Audits sign in with the audit admin and audit member accounts, never the owner account.
- Any resource, resource edit or bookmark collection a QA run creates has a title (collection: name) starting `[QA-qa-audit-<RUN_ID>]`, so `/api/admin/qa-rows` (`server/routes/domains/qa-cleanup.ts`, tables `resources`, `resource_edits`, `bookmark_collections`) can find and delete it. Every QA resource insert and status change also writes an audit-log row (`server/repositories/ResourceRepository.ts:947`, `server/repositories/resourcePublication.ts:86`) and each cleanup delete writes a `qa_cleanup` row (`qa-cleanup.ts:237`); qa-rows lists audit-log and bookmark rows with `deletable:false` (`qa-cleanup.ts:202`). A signed-in member who opens `/resource/:id` writes a `user_interactions` view row (`client/src/pages/ResourceDetail.tsx:501-507`, `POST /api/interactions`). Both are expected side effects: record them in the run report, do not avoid them by skipping QA writes. No QA actor creates API keys, journey enrollments, onboarding progress, bookmarks without a cleanup step, or sign-ups other than a throwaway `@example.com` address stopped at the code screen. Member lanes browse `/resource/:id` signed out unless the row needs sign-in.
- Deploys go through the `replit-deploy` skill, including its pre-publish schema check.

## Deploy

- Production (https://awesome.video) deploys from GitHub `main` through `.claude/skills/replit-deploy/SKILL.md`. A deploy is done when `/api/version` equals `origin/main` and `/api/health/ready` returns 200.
- Known pitfalls (the empty "Published your App" commit, analytics turned off under `navigator.webdriver`, held-key radio checks) are in `replit.md` under "Deploy pitfalls".
