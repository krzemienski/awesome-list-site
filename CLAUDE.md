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
| URLs containing `?`, `*` or `==` in `curl`/`wget` commands are single-quoted. | `~/.claude/hooks/awesome-list-site/url-quote-guard.py` (Claude Code user hook) |
| A review message is sent only while the worktree `HEAD`, the `.review-pin` SHA and the PR `headRefOid` are the same commit. | `~/.claude/hooks/awesome-list-site/review-pin-guard.py` (Claude Code user hook) |
| `gh pr merge` and `…/pulls/<N>/merge` run only with every review thread resolved and a `VERDICT: APPROVE <sha>` comment naming `headRefOid`. | `~/.claude/hooks/awesome-list-site/merge-guard.py` (Claude Code user hook) |

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
- Run TypeScript probes with `vite-node`, not plain `tsx`. macOS `/tmp` is `/private/tmp`.
- Compare touched-file eslint against the base commit, not against zero.
- When local `main` is behind, read files with `git show origin/main:<path>`.

## Safety

- Respect hook blocks: report the block and ask. Never route around one.
- Never print cookies, tokens or full emails.
- QA cleanup runs as an account listed in `QA_CLEANUP_USER_IDS`.

## Agent messaging

- A `SendMessage` report is at most 5 lines: verdict, SHA, PASS/FAIL/NEEDS_YOU counts, evidence path. Full detail goes in the result JSON on disk.

## Production QA conventions

- Audits sign in with the audit admin and audit member accounts, never the owner account.
- Any row a QA run creates has a title starting `[QA-qa-audit-<RUN_ID>]`, so `/api/admin/qa-rows` (`server/routes/domains/qa-cleanup.ts`) can find and delete it.
- Deploys go through the `replit-deploy` skill, including its pre-publish schema check.

## Deploy

- Production (https://awesome.video) deploys from GitHub `main` through `.claude/skills/replit-deploy/SKILL.md`. A deploy is done when `/api/version` equals `origin/main` and `/api/health/ready` returns 200.
- Known pitfalls (the empty "Published your App" commit, analytics turned off under `navigator.webdriver`, held-key radio checks) are in `replit.md` under "Deploy pitfalls".
