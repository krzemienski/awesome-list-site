# Self-healing trigger research (design D, PLAN §7)

> Research only. Nothing below was created, installed or run against prod. Layout is mine (no template given).
> Doc facts come from a claude-code-guide pass over code.claude.com (2026-11-06); items marked **inference** or **untested** are not stated in the docs.
> Local facts checked: Claude Code 2.1.319, gh 2.103.3 logged in as `krzemienski` (HTTPS), `~/Library/LaunchAgents` already holds user agents, `pmset` shows sleep currently prevented by `caffeinate`. Repo labels today: GitHub defaults plus `codex`; **no `selfheal` label exists yet**.

## Recommendation (one line)
Tier 0 = plain launchd job (bash + curl, no LLM, every 30 min). Tier 1 = launchd job running `claude -p` every 6 h, but **only when Tier 0 has failed since the last run or on the 6 h tick**; auth by `CLAUDE_CODE_OAUTH_TOKEN`; permissions from a dedicated `--settings` file with deny rules plus a PreToolUse hook as the hard guard. Do not use cloud routines, desktop tasks or `/loop` for this.

## (a) Options compared
| | Survives reboot/sleep | Min interval | Cost / auth | Local worktrees + gh | Failure visibility |
|---|---|---|---|---|---|
| **Cloud scheduled tasks (routines)** https://code.claude.com/docs/en/routines.md (research preview) | Yes, runs on Anthropic infra, laptop can be off | **1 h** (shorter is rejected) so cannot do 30 min | Subscription usage; needs claude.ai login; capped 100 runs/h/account | **No local files**, fresh clone each run; pushes `claude/*` branches; `gh` not documented, GitHub via connector | History list shows Error/Succeeded; no push alert documented |
| **Desktop scheduled tasks** https://code.claude.com/docs/en/desktop-scheduled-tasks.md | Only while the app is running **and the Mac is awake**; missed runs skipped, one catch-up on wake; auto-start after reboot not documented | Form: hourly min; Claude-set shorter possible | Subscription (implied) | Yes: local files, a "Worktree" checkbox per task, config MCP servers | History shows skipped runs; no failure push documented; a task waiting on a permission prompt stalls |
| **launchd/cron + `claude -p`** https://code.claude.com/docs/en/headless.md | OS-level; launchd runs jobs after reboot/login (launchd semantics, not in Claude docs); sleep skips/coalesces fires (**inference**) | Any | Subscription via `CLAUDE_CODE_OAUTH_TOKEN` (from `claude setup-token`, 1 yr) or API key. `ANTHROPIC_API_KEY` in env **wins and bills the API** | Yes: run in a worktree dir or `claude -p --worktree <name>`; gh works | Exit code non-zero on failure, `--output-format json` gives `result`, `total_cost_usd`; alerts are your wrapper's job (or a `StopFailure` hook) |
| **`/loop` / CronCreate** https://code.claude.com/docs/en/scheduled-tasks.md | **No.** Fires only while a session is running and idle; reboot kills it; 7-day expiry; jitter up to 30 min | 1 min | Session's own | Inherits session | None |

Notes that decide it:
- 30-minute cadence rules out cloud and (reliably) desktop tasks. Reboot/sleep rules out `/loop`.
- Subscription vs API: `claude -p` still draws subscription limits (https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan; docs note a June 2026 policy change was paused, so re-check before relying). The Max monthly API credits (https://support.claude.com/en/articles/17154008-monthly-api-credits-for-max-ultra-and-team-plans) apply only to API-key runs; whether OAuth-token runs get them is unconfirmed.
- `CLAUDE_CODE_OAUTH_TOKEN` is model-requests only (no claude.ai connectors, no Remote Control); local MCP servers still work (https://code.claude.com/docs/en/authentication.md). It avoids the macOS Keychain-under-launchd question (**inference**; Keychain behaviour in launchd is **untested/undocumented**).
- Your shell exports `ANTHROPIC_*` (harness proxy, per project memory). Credential precedence puts those above the OAuth token, so the plist must not inherit them: set `EnvironmentVariables` explicitly and run with `env -u ANTHROPIC_API_KEY -u ANTHROPIC_AUTH_TOKEN -u ANTHROPIC_BASE_URL`. Verify with `claude auth status` (JSON `authMethod` must be `oauth_token`).
- Usage policy (https://code.claude.com/docs/en/legal-and-compliance.md) says plan limits assume "ordinary, individual usage"; personal automation is not addressed. Cost is bounded by Tier 0 gating plus `--max-budget-usd` / `--max-turns` (https://code.claude.com/docs/en/cli-reference.md; budget is a client-side estimate and can overshoot).

## (b) Tier 0 without an LLM
A bash script run by launchd `StartInterval 1800`. It only does GETs to awesome.video and writes state; the LLM job reads that state.
- Checks (all GET): `/api/health` = `{"status":"ok"}`; `/api/version` revision equals the expected main SHA (or just records it); `/` and one category page return 200 with the expected `<title>`; `/api/resources?limit=1` has `total` > 0 and within a band of yesterday's 4074; `/api/categories` non-empty; `/api/auth/status` 200. `curl -sS -m 20 --retry 2` per check; fail only after 2 consecutive misses (flap guard).
- State: `~/.local/state/selfheal/tier0.json` with `{ts, failing:[ids], consecutive:{id:n}, first_failed_at}`; append-only `tier0.log`.
- On first failure of a check: macOS notification (`osascript -e 'display notification …'`) and `touch ~/.local/state/selfheal/WAKE_TIER1`. Tier 1's job also fires on a 6 h timer regardless (drift/log review).
- Tier 0 never writes to GitHub and never touches awesome.video with non-GET.
- launchd caveat: if the Mac sleeps, `StartInterval` jobs do not accumulate; they run once on wake (**inference**). Add a heartbeat file and have Tier 1 treat a heartbeat older than 90 min as its own finding ("Tier 0 not running").

## (c) GitHub issue dedupe
- One-time (deferred, needs owner OK because it writes to GitHub): create label `selfheal` plus `sev:*` if wanted.
- Fingerprint = `sha1(check_id + normalised signature)` truncated to 10 hex chars, where signature drops timestamps, request ids and numbers. Put it in the title as `[sh:3fa91c0d2e] <check_id>: <short symptom>` and again in the body.
- Lookup before creating: `gh issue list --label selfheal --state all --search "sh:3fa91c0d2e in:title" --json number,title,state,closedAt --limit 5`, then confirm with `jq` that a title really contains the fingerprint (GitHub search is token-based and can match loosely).
- Rules: open match → `gh issue comment` with a one-line recurrence + count, no new issue. Closed within 7 days → reopen with a comment (regression), do not file a new one. No match → `gh issue create --label selfheal --title … --body …`. Tier 1 also dedupes against its own PRs by `gh pr list --search "sh:<fp> in:title" --state all`.
- Cap: at most N (say 3) issues and 1 PR per run; if more distinct failures, file one "multiple failures" issue. Prevents a flood during a total outage.
- **Untested:** Axiom query access. Not researched here; assume `curl` POST to the Axiom API with a read-scoped token from a chmod 600 env file. That is a POST but not to awesome.video, so it needs its own narrow allow rule (below).

## (d) Permission model
Mechanics (https://code.claude.com/docs/en/permissions.md, https://code.claude.com/docs/en/permission-modes.md, https://code.claude.com/docs/en/hooks.md):
- Order is deny → ask → allow; an allow cannot override a deny. **Deny rules apply in every mode, including `bypassPermissions`.** Never use `--dangerously-skip-permissions` anyway.
- In `-p`, a project's `.claude/settings.json` **allow** rules are ignored (no trust dialog; deny/ask still apply). Put allow rules in the `--settings` file or user settings. Whether `--settings` allow rules take effect is inferred, not stated: **test it** before relying.
- Use `--permission-mode dontAsk` (or `--permission-prompts none`, v2.1.259+): anything not allowed is denied instead of stalling.
- Deny rules are not a security boundary: they do not catch full-path invocations or `sh -c`. So also add a **PreToolUse hook** (exit 2 blocks even if the hook prints JSON). A hook that times out does not block by default; set `onFailure: "block"`. `--bare` skips hooks, so do not use `--bare`.
- MCP deny syntax: `mcp__<server>__<tool>`; `mcp__replit` or `mcp__replit__*` denies the whole server. Prefer `--strict-mcp-config` with an empty config so no MCP server loads at all (publish_app cannot even be called).
- Sandbox (https://code.claude.com/docs/en/sandboxing.md) covers shell only, not MCP/Write/WebFetch, and `gh` may fail TLS under Seatbelt on macOS. Leave it off or test first; do not count on it as the guard.

Allow (Tier 1): `Read`, `Grep`, `Glob`; `Edit`/`Write` only inside the fix worktree (hook enforces path); `Bash(curl -sS -m 30 https://awesome.video/*)` **GET only** (hook rejects any `-X`, `-d`, `--data`, `-F`, `-T` against awesome.video); `Bash(curl * https://api.axiom.co/*)` with read token; `Bash(gh issue list *)`, `gh issue view *`, `gh issue create *`, `gh issue comment *`, `gh issue reopen *`, `gh pr list *`, `gh pr create *`, `gh pr view *`, `gh pr checks *`; `Bash(git status *)`, `git diff *`, `git log *`, `git fetch *`, `git worktree add *`, `git checkout -b selfheal/*`, `git add *`, `git commit *`, `git push -u origin selfheal/*`; `Bash(npx tsc --noEmit)`, `npm run build`, `npx eslint *`.

Deny (in the settings file, so they hold in every mode):
- `mcp__replit__publish_app`, `mcp__replit__update_app_using_prompt`, and `mcp__*` as a whole (plus `--strict-mcp-config`).
- `Bash(git push *main*)`, `Bash(git push --force*)`, `Bash(git push -f*)`, `Bash(git push origin HEAD:main*)`, `Bash(git reset --hard*)`, `Bash(git branch -D*)`.
- `Bash(gh pr merge *)`, `Bash(gh api *)` (no raw API; blocks `-X`), `Bash(gh repo *)`, `Bash(gh release *)`, `Bash(gh secret *)`, `Bash(gh workflow run *)`.
- `Bash(ssh *)`, `Bash(scp *)`, `Bash(rsync *)` (the Replit workspace is reachable by SSH; deploys are owner-approved only).
- `Bash(curl -X *)`, `Bash(curl * --data*)`, `Bash(curl * -d *)`, `Bash(wget *)` as a first layer; the PreToolUse hook is the real one for awesome.video non-GET (and for the one Axiom POST exception it whitelists host `api.axiom.co` only).
- Reads of secrets: `Read(~/.cache/awesome-audit/**)`, `Read(**/.env*)`, `Read(~/.ssh/**)`. Never run `agent-browser cookies get`.
The agent never deploys: a merged fix reaches prod only through the owner's normal deploy (replit-deploy), consistent with "owner approves".

## Concrete layout (proposal, not created)
```
~/Library/LaunchAgents/
  dev.awesomevideo.selfheal.tier0.plist   StartInterval 1800, RunAtLoad true, StandardOut/ErrPath ~/.local/state/selfheal/tier0.out|err
  dev.awesomevideo.selfheal.tier1.plist   StartInterval 21600, RunAtLoad false, ProcessType Background, EnvironmentVariables{HOME,PATH incl. /opt/homebrew/bin, CLAUDE_CODE_OAUTH_TOKEN via wrapper reading chmod 600 file}
~/.local/share/selfheal/               (kept outside the repo)
  tier0.sh          curl checks, state json, notification, WAKE_TIER1 flag
  tier1.sh          wrapper: env -u ANTHROPIC_*; skip if no WAKE flag and tick not due; flock; run claude; check exit + is_error; notify on failure; rotate logs
  settings.json     permissions allow/deny above, hooks.PreToolUse -> guard.sh (onFailure block)
  guard.sh          reads tool-call JSON on stdin; exit 2 on: non-GET to awesome.video, push to main, force push, any mcp__replit__*, path writes outside the worktree
  prompt.md         the Tier 1 instructions (read state, query Axiom, dedupe, file issue / open PR from a worktree, never merge/deploy)
  axiom.env         chmod 600, read-scoped token (not in repo, not in prompt)
```
Tier 1 command (inside tier1.sh; inside a fresh worktree created by the wrapper, e.g. `git -C <repo> worktree add ~/.local/share/selfheal/wt/<ts> -b selfheal/<fp> origin/main`):
```
env -u ANTHROPIC_API_KEY -u ANTHROPIC_AUTH_TOKEN -u ANTHROPIC_BASE_URL \
claude -p "$(cat prompt.md)" \
  --settings ~/.local/share/selfheal/settings.json --strict-mcp-config --mcp-config '{"mcpServers":{}}' \
  --permission-mode dontAsk --max-turns 40 --max-budget-usd 3 \
  --output-format json --no-session-persistence --model sonnet \
  > run.json
```
Cleanup: `-p` does not remove worktrees; the wrapper runs `git worktree remove` for runs that opened no PR and prunes ones older than 7 days.

## Open items (must be tested before adoption, none involve prod)
1. Keychain/OAuth-token behaviour under launchd (`claude auth status` from a launchd-run script).
2. Do `--settings` allow rules apply in `-p`; do deny rules in it hold (try a deliberately denied command in a scratch repo).
3. Do hooks run under `-p` with `dontAsk` (try a hook that always exits 2).
4. Whether subscription limits tolerate a 6 h cadence plus wake-ups (usage policy wording above).
5. Axiom API access, token scope and the exact APL query; not researched here.
6. Creating the `selfheal` label and any GitHub write is deferred until the owner approves.
