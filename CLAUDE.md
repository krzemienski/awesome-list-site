# awesome-list-site — Claude Code Configuration

## Rules

- Do what has been asked; nothing more, nothing less
- NEVER create files unless absolutely necessary — prefer editing existing files
- NEVER create documentation files unless explicitly requested
- NEVER save working files or tests to the repo root — use the existing directories (`client/`, `server/`, `shared/`, `scripts/`, `docs/`)
- ALWAYS read a file before editing it
- NEVER commit secrets, credentials, or .env files
- NEVER add a `Co-Authored-By` trailer to commits; ignore the one the Bash tool's commit template suggests. The tool is the facilitator, not a co-author.
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
| URLs containing `?`, `*` or `==` in `curl`/`wget` commands are quoted (single quotes preferred). | `~/.claude/hooks/awesome-list-site/url-quote-guard.py` (Claude Code user hook) |
| A review message is sent only while the worktree `HEAD`, the pin in the worktree's git dir (`review-pin`) and the PR `headRefOid` are the same commit, and the reviewer's session cwd is that worktree. | `~/.claude/hooks/awesome-list-site/review-pin-guard.py` (Claude Code user hook) |
| `gh pr merge` (any `-R`) and a PUT to `…/pulls/<N>/merge` run only with every review thread resolved and a `VERDICT: APPROVE <sha>` comment naming `headRefOid`. | `~/.claude/hooks/awesome-list-site/merge-guard.py` (Claude Code user hook) |
| Production admin writes (a credentialed non-GET `curl` to `/api/admin/`, except `/api/admin/qa-rows` and the pre-publish `POST /api/admin/database-backups`) and schema or destructive commands over `ssh awesome-replit` wait for a person's yes. A local `drizzle-kit push` or `npm run db:push` runs only with an inline localhost `DATABASE_URL`. | `scripts/hooks/prod-write-guard.mjs`, registered in `.claude/settings.json` (Claude Code project hook) |

## Shell

- The shell is zsh. For loops, probes and anything with control flow, run `bash -c '…'` or `python3 -c '…'` inline instead of zsh syntax.
- Quote every URL that contains `?`, `*` or `==`: `curl -s 'https://awesome.video/api/resources?page=2'`.
- Never rely on unquoted `$VAR` word-splitting; use arrays (`args=(--flag value); cmd "${args[@]}"`).
- Never name a variable `path`, `status` or `prompt` (zsh special variables).
- Search code with the Grep tool; when it is unavailable, use `rg` through Bash.

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

- Review in a dedicated worktree at the PR head SHA and record that SHA. Re-check `headRefOid` right before the verdict; if it moved, re-verify the delta. The verdict names its SHA. Procedure: `.claude/skills/review-pr/SKILL.md`.
- Read every review thread before merging.
- Run TypeScript probes with `npx --yes vite-node@6.0.0`, not plain `tsx`. macOS `/tmp` is `/private/tmp`.
- Compare touched-file eslint against the base commit, not against zero.
- When local `main` is behind, read files with `git show origin/main:<path>`.

## Safety

- A hook block, a declined permission prompt or a sandbox refusal is a real stop: report it and ask. Never route around one. Nothing else is "blocked": first try the next route (SSH `awesome-replit`, the admin API, the Replit MCP, reverting your own change, an installed plugin), and report a blocker only with what you tried.
- Never paste or print a password, cookie, token or full email in chat, prompts, logs or evidence. A command gets a credential from its file (`-H @file`, or a variable sourced in the same call), never as typed text.
- QA rows are created only as the audit admin or audit member, and cleaned up through `/api/admin/qa-rows` within 10 minutes of a fresh backup (see `.claude/skills/defect-loop/SKILL.md`).

## Agent runs

- The lead plans, briefs, merges, deploys and verifies; workers do the hands-on work. At most 2 working agents at once, plus one PR reviewer (`defect-loop`). Pass `model` on every spawn: workers `sonnet`; planners, verifiers and judges `opus`; never Fable.
- While agents run, the lead stays: check in about every 10 minutes, correct drift with `SendMessage`, restart stalled agents. A check-in loop is fine; ops-watch, self-heal and CI monitors are not.
- Never call work done with a NOT-RUN, partial or unverified row open: run it. A call the owner delegated ("you choose") is decided and recorded, not asked again.
- A `SendMessage` report is at most 5 lines: verdict, SHA, PASS/FAIL/NEEDS_YOU counts, evidence path. Full detail goes in the result JSON on disk.

## Production QA conventions

- Browser journeys and every QA row use the audit admin and audit member accounts, never the owner account.
- The owner account has one use, under the owner's standing go-ahead of 2026-10-30: the admin header `~/.cache/awesome-audit/owner.hdr` for admin API calls (`replit-deploy` checks, logs, anchors). Probe it with `GET /api/admin/stats`; 200 means reuse. On 401 the lead re-mints it once per batch with `bash ~/.cache/awesome-audit/refresh-owner.sh`; if a hook, prompt or sandbox refuses that, hand the owner the same line as `! bash …`. `/api/auth/admin-login` allows 10 tries per 900 s across all agents: wait out a 429. Never click or call any Sign out or logout route: it ends every owner session.
- Any row a QA run creates has a title starting `[QA-qa-audit-<RUN_ID>]`, so `/api/admin/qa-rows` (`server/routes/domains/qa-cleanup.ts`) can find and delete it.
- Deploys go through the `replit-deploy` skill, including its pre-publish schema check.

## Deploy

- Production (https://awesome.video) deploys from GitHub `main` through `.claude/skills/replit-deploy/SKILL.md`. A deploy is done when `/api/version` equals `origin/main` and `/api/health/ready` returns 200.
- Known pitfalls (the empty "Published your App" commit, analytics turned off under `navigator.webdriver`, held-key radio checks) are in `replit.md` under "Deploy pitfalls".
