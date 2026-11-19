# awesome-list-site — Codex Configuration

## Rules

- Do what has been asked; nothing more, nothing less
- NEVER create files unless absolutely necessary — prefer editing existing files
- NEVER create documentation files unless explicitly requested
- NEVER save working files or tests to the repo root — use the existing directories (`client/`, `server/`, `shared/`, `scripts/`, `docs/`)
- ALWAYS read a file before editing it
- NEVER commit secrets, credentials, or .env files
- NEVER add a `Co-Authored-By` trailer to commits; ignore any commit-message template that suggests one. The tool is the facilitator, not a co-author.
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
| URLs (with or without `https://`, also `--url=`) containing `?`, `*` or `==` in `curl`/`wget` commands are quoted (single quotes preferred). | `~/.claude/hooks/awesome-list-site/url-quote-guard.py` (Claude Code user hook; Codex has no equivalent, check by hand) |
| Production admin requests and argument-bearing SSH are subject to the project write guard. Preserve the server-enforced QA cleanup scope and fresh backup. Schema pushes require separate review. | `scripts/hooks/prod-write-guard.mjs` and `server/routes/domains/qa-cleanup.ts` |

## Shell

- The shell is zsh. For loops, probes and anything with control flow, run `bash -c '…'` or `python3 -c '…'` inline instead of zsh syntax.
- Quote every URL that contains `?`, `*` or `==`: `curl -s 'https://awesome.video/api/resources?page=2'`.
- Never rely on unquoted `$VAR` word-splitting; use arrays (`args=(--flag value); cmd "${args[@]}"`).
- Never name a variable `path`, `status` or `prompt` (zsh special variables).
- Search code with `rg`.

## Browser QA

- `agent-browser` on system Chrome is the default driver. The chrome-devtools MCP gets at most one try with a 10 s timeout. Never report BLOCKED for driver reasons: switch driver and continue.
- Use real pointer clicks and key presses. A DOM `.click()` is allowed only for below-fold targets that headless cannot scroll to, and the evidence must label it.
- Dismiss overlays and wait for `#ssr-seo-hold` to be gone and `#root` to have children before interacting.
- Set the viewport, then assert `window.innerWidth` before capturing evidence. Use tall viewports for pagers and footers.
- Retry Radix radio groups with a held key before grading them.
- Override `navigator.webdriver` only when judging analytics. Touch-emulation gaps are caveats, not failures, but touch rows run in touch Chrome (`qa-lane`).
- On a daemon "os error 35", kill the daemon by PID and restart it.
- Lane procedure: `.claude/skills/qa-lane/SKILL.md`.

## Code Review

- A PR review runs in a dedicated worktree at the PR head SHA and records that SHA. Re-check `headRefOid` right before the verdict; if it moved, re-verify the delta. The verdict names its SHA. Procedure: `.claude/skills/review-pr/SKILL.md`. A review happens when the owner asks for one or the change is risky; it is not part of releasing, and a release adds no independent reviewer, pin, verdict or wait of its own.
- Address substantive review findings and respect platform policy.
- Run TypeScript probes with `npx --yes vite-node@6.0.0`, not plain `tsx`. macOS `/tmp` is `/private/tmp`.
- Compare touched-file eslint against the base commit, not against zero.
- When local `main` is behind, read files with `git show origin/main:<path>`.

## Safety

- A hook block, a declined approval or a sandbox refusal is a real stop: report it and ask. Never route around one. Nothing else is "blocked": first try the next route (SSH `awesome-replit`, the admin API, the Replit MCP, reverting your own change, an installed plugin), and report a blocker only with what you tried.
- Never paste or print a password, cookie, token or full email in chat, prompts, logs or evidence. A command gets a credential from its file (`-H @file`, or a variable sourced in the same call), never as typed text.
- QA rows are created only as the audit admin or audit member. `/api/admin/qa-rows` deletes three row types (resources, resource edits, bookmark collections); clean those up through it within 10 minutes of a fresh backup taken for that cleanup batch (the route accepts only the newest backup, completed no more than 10 minutes ago; see `.claude/skills/defect-loop/SKILL.md`). Side effects of allowed QA writes that no path can delete are expected, never forbidden, and the run report lists them: audit-log rows and signed-in `user_interactions` view rows. No QA actor creates API keys, journey enrollments, onboarding progress, bookmarks without a cleanup step, or sign-ups other than a throwaway `@example.com` address stopped at the code screen. Member lanes browse `/resource/:id` signed out unless the row needs sign-in.

## Agent runs

- The lead plans, briefs, merges, deploys and verifies; workers do the hands-on work. In a `defect-loop` run, at most 2 working agents at once. Merging and releasing take no agent count of their own. Pass `model` on every spawn: workers `sonnet`; planners, verifiers and judges `opus`; never Fable.
- While agents run, the lead stays: check in about every 10 minutes, correct drift with `SendMessage`, restart stalled agents. A check-in loop is fine; background watchers, automatic repair loops and CI monitors are not.
- Never call work done with a NOT-RUN, partial or unverified row open: run it. A call the owner delegated ("you choose") is decided and recorded, not asked again.
- A `SendMessage` report is at most 5 lines: verdict, SHA, PASS/FAIL/NEEDS_YOU counts, evidence path. Full detail goes in the result JSON on disk.

## Production QA conventions

- Browser journeys and every QA row use the audit admin and audit member accounts, never the owner account.
- The owner account has one use (owner, 2026-10-30: "you are not blocked"; owner, 2026-11-16, delegating this call: "you decide"): the admin header `~/.cache/awesome-audit/owner.hdr` for admin API calls (a targeted job lookup before a publish, logs, anchors). Probe it with `GET /api/admin/stats`; 200 means reuse. On 401 the lead re-mints it once per batch with `bash ~/.cache/awesome-audit/refresh-owner.sh`; if a hook, sandbox or approval refuses that, hand the owner the same command to run. `/api/auth/admin-login` allows 10 tries per 900 s across all agents: wait out a 429. Never click or call any Sign out or logout route: it ends every owner session.
- Any resource, resource edit or bookmark collection a QA run creates has a title (collection: name) starting `[QA-qa-audit-<RUN_ID>]`, so `/api/admin/qa-rows` (`server/routes/domains/qa-cleanup.ts`, tables `resources`, `resource_edits`, `bookmark_collections`) can find and delete it. The route is run-scoped: `GET /api/admin/qa-rows?runId=<RUN_ID>` and the DELETE body's `runId` are validated server-side (`YYYYMMDDTHHMM[SS]Z`), and the server builds the exact prefix, so nothing outside that run is listed, counted or deletable. Every QA resource insert and status change also writes an audit-log row (`server/repositories/ResourceRepository.ts:947`, `server/repositories/resourcePublication.ts:86`) and each cleanup delete writes a `qa_cleanup` row (`qa-cleanup.ts`); qa-rows lists audit-log and bookmark rows with `deletable:false`. A signed-in member who opens `/resource/:id` writes a `user_interactions` view row (`client/src/pages/ResourceDetail.tsx:501-507`, `POST /api/interactions`). Both are expected side effects: record them in the run report, do not avoid them by skipping QA writes. No QA actor creates API keys, journey enrollments, onboarding progress, bookmarks without a cleanup step, or sign-ups other than a throwaway `@example.com` address stopped at the code screen. Member lanes browse `/resource/:id` signed out unless the row needs sign-in.
- Deploys go through the `replit-deploy` skill, including its schema review when a schema file or migration changed.

## Deploy

- A release is four moves: merge ready changes into `main`, sync the Replit workspace to the intended `origin/main`, publish once, then verify the version, readiness and the changed behavior. Production (https://awesome.video) is published through `.claude/skills/replit-deploy/SKILL.md`; the contract is `RELEASE.md`. Each ready logical fix ships on its own, promptly; never hold one to batch or to wait for an audit.
- Publish only a change with a runtime purpose (it changes what production runs, serves, builds or stores). A merge that only changes docs, skills or notes is not published unless the owner asks; judge by the diff and by who reads the file, not by its extension. Production may trail `origin/main` by such commits; a skipped release is not a deploy, so never call production current with `origin/main` unless `/api/version` equals it.
- A release is done when `/api/version` equals the exact intended commit, `/api/health/ready` returns 200 and the changed behavior works.
- A release adds no independent reviewer, review pin, verdict comment, timer, agent or thread count, routine per-publish backup (the owner declined one), blanket job check, evidence bundle, paid Agent run, owner-session preflight or extra build. Keep: the engineering build, the schema review when a schema file or migration changed (a destructive or ambiguous actual Publishing-pane diff needs a fresh, completed, recoverable production backup and human review before apply, even if the git diff looked safe; no usable backup means do not apply), a targeted lookup for a job you know is running (never cancel it to publish; if a restart would waste real work, handle it first), recovery steps, and the exact server cleanup and backup contract.
- A full production audit and its closure (a clean pass on one SHA, then the two-hour window; `.claude/skills/defect-loop/SKILL.md`) are separate work. They never gate a merge or a publish.
- A platform provider's refusal (Replit, GitHub, Cloudflare, Clerk), a hook block and a declined approval are stops. The one documented hand-off is Replit refusing `publish_app` for a schema diff: the owner publishes from the Publishing pane, after the backup and review above when the diff is destructive or ambiguous.
- Known pitfalls (the empty "Published your App" commit, analytics turned off under `navigator.webdriver`, held-key radio checks) are in `replit.md` under "Deploy pitfalls".
