---
name: replit-deploy
description: Redeploy awesome.video to production on Replit from GitHub main, end to end and unattended. Syncs the Replit workspace to origin/main over SSH, runs npm run db:push against the workspace dev database, publishes through the Replit MCP server (publish_app), polls get_publish_status, then proves the live site serves the new commit via /api/version and checks it as a visitor. Use whenever the user says deploy, redeploy, republish, publish, ship to prod, push it live, release, "get main onto awesome.video", "is the published version the latest", or asks why production is behind main; and whenever /api/version is behind origin/main, publish_app is refused, the Replit workspace needs syncing, or a "Published your App" commit appears, even if they don't name Replit.
---

# Redeploy awesome.video from GitHub main

The goal is one observable fact: `https://awesome.video/api/version` returns `{"revision":"<origin/main SHA>"}` and the site works for a visitor. Everything below serves that.

Run unattended. Stop and report only on the stop conditions named in each step; never "fix" them by force, because each one means production could lose data or ship code nobody reviewed.

## How the pieces fit (why the steps are ordered this way)

- Publishing snapshots the **Replit workspace files**, not GitHub. So the workspace must be at origin/main before you publish. There is no CLI, REST API or GitHub-triggered deploy; MCP `publish_app` is the only programmatic trigger.
- `npm run build` stamps `BUILD_REVISION=$(git rev-parse HEAD)` of the workspace into the bundle, and `/api/version` serves it. That is why the live revision is a reliable proof of what shipped.
- At publish, Replit diffs the **dev database schema against production** and applies the difference (drizzle-kit based, with a conflict dialog for destructive changes). `npm run db:push` on the dev DB therefore decides the production schema of the next publish.
- Agent checkpoints, Monitoring Auto-fix and Agent task merges commit inside the workspace. Those commits are not on GitHub, which is the usual cause of divergence.
- `.replit` `[deployment]`: Autoscale, build `bash scripts/publish-build.sh`, run `npm run start`, port 5000 → 80. The homepage must answer within 5 s or Promote fails.

## Prerequisites (one-time, human)

Check these first; if one is missing, stop and tell the user exactly which, because no later step works without them.

1. **Replit MCP authenticated.** `mcp__replit__*` tools beyond `authenticate` are available. If only `authenticate`/`complete_authentication` exist, the user must run `/mcp` → replit → Authenticate → choose workspace → Allow.
2. **SSH host alias `awesome-replit`.** `ssh -o BatchMode=yes -o ConnectTimeout=20 awesome-replit true` exits 0. Setup if missing: `ssh-keygen -t ed25519 -f ~/.ssh/replit -q -N ""`, add `~/.ssh/replit.pub` at replit.com/settings/advanced → SSH keys, then copy the host/user from the project's SSH pane (Connect → "Connect manually") into `~/.ssh/config`:
   ```
   Host awesome-replit
       HostName <id>-00-<suffix>.<cluster>.replit.dev
       User <replId>
       Port 22
       IdentityFile ~/.ssh/replit
       StrictHostKeyChecking accept-new
   ```
   The `.replit.dev` hostname can change after a cluster migration; if the alias stops resolving, get the new one from the SSH pane.

   Run this check first, every deploy. If it fails, do not stop the deploy: take the **Agent sync** path in step 2 and tell the user once that SSH is down (each Agent sync is a paid Agent run).

## Steps

Save every command and its output under `e2e-evidence/replit-deploy/<UTC timestamp>/` (one file per step). The final report cites these files.

### 1. Pin the target

```bash
git fetch origin && git rev-parse origin/main          # TARGET
curl -s https://awesome.video/api/version               # BEFORE
```
If BEFORE already equals TARGET, say production is current and stop unless the user asked for a forced republish.

Check GitHub CI for TARGET (`gh run list --branch main --limit 5`). A failing required check on TARGET is a stop condition: shipping it is a decision for the user.

### 2. Sync the workspace (SSH)

SSH lands in the container; the repo root is the directory containing `.replit` (normally `~/workspace`). Run as one remote script so a failure stops the rest:

```bash
ssh awesome-replit 'set -e; cd ~/workspace
git status --porcelain; git rev-parse --abbrev-ref HEAD; git rev-parse HEAD
git fetch origin main
git log --oneline origin/main..HEAD   # workspace-only commits
'
```

Stop conditions:
- **Dirty tree** (`git status --porcelain` not empty): someone or Replit Agent has uncommitted work there. Report the file list.
- **Not on `main`.**
- **Workspace-only commits** (`origin/main..HEAD` not empty): report them with `git log --stat`. They are usually Agent checkpoints; the user decides whether to push them to GitHub or drop them.
  - Exception, observed 2026-10-26: every Publish adds an empty "Published your App" commit (author Replit Agent) on top of the published HEAD, so the next fast-forward always fails. When it is the only workspace-only commit and `git rev-parse <it>^{tree} <it>^^{tree}` prints the same tree twice (it changes no files), and `git branch -a --contains <it>` shows it is kept on `replit-agent` / `gitsafe-backup/main`, move main with `git reset --keep origin/main` instead of `--ff-only`. Anything else is still a stop.

Otherwise fast-forward only:
```bash
ssh awesome-replit 'set -e; cd ~/workspace; git merge --ff-only origin/main; git rev-parse HEAD'
```
The printed HEAD must equal TARGET.

If `git fetch` fails on auth, the workspace has lost its GitHub connection; stop and tell the user to reconnect it in the Git pane.

**Agent sync (when SSH is down).** This is the one sanctioned use of `update_app_using_prompt`. Send this brief and nothing more: "Sync only, write no code. git fetch origin. If main has commits not on origin/main, continue only if each changes no files (an empty Published your App commit), then `git reset --keep origin/main`; otherwise, or if the tree is dirty or the branch is not main, stop and report. Else `git merge --ff-only origin/main` to <TARGET>. Then npm install and npm run db:push (only if the step-3 gate says so). Abort and report on any drizzle prompt. No checkpoint commit, no lockfile commit. Report HEAD, status and log." Then confirm with read-only `ask_question` asking for the verbatim output of `git rev-parse HEAD`, `git status --short --untracked-files=all` and `git log --oneline -3`. Its replies are Agent's own report, so require the exact command output, not a summary. HEAD must equal TARGET, and status must print nothing (an untracked file blocks a clean publish too).

### 3. Dependencies and dev schema (SSH)

Gate first. Diff what can change dependencies or the schema between the live revision and TARGET:
```bash
git diff --stat <BEFORE> <TARGET> -- package.json package-lock.json shared/schema.ts migrations drizzle.config.ts
```
- Empty: skip `npm install` and `db:push`; the publish build installs dependencies itself, and step 5 will publish from MCP. Advice to run them anyway (Replit Agent has given it) is not a reason to.
- Not empty: run both below. If `shared/schema.ts` or `migrations` changed, `publish_app` will be refused (step 5); tell the user before publishing that they will review and publish this one from the Publishing pane.

```bash
ssh awesome-replit 'set -e; cd ~/workspace; test -n "$DATABASE_URL" && echo DATABASE_URL=set; npm install'
ssh awesome-replit 'cd ~/workspace; timeout 300 npm run db:push 2>&1'
```

- Never print `DATABASE_URL` or any secret value; test presence only. If it is unset in the SSH session, secrets are not exported there; stop and report, because db:push would target nothing.
- If drizzle-kit asks a question (data loss, truncation, rename vs create) or times out waiting for input, **stop**. Do not add `--force` or answer it: the same diff will be applied to production at publish. Report the statements it wanted to run.
- `npm install` may rewrite `package-lock.json` (Replit's internal registry). Re-run `git status --porcelain`; if anything changed, report it but do not commit it.

### 4. Build pre-check (SSH)

```bash
ssh awesome-replit 'cd ~/workspace; timeout 900 bash scripts/publish-build.sh 2>&1 | tail -80'
```
Safe in the workspace: the image-trim step runs only when `REPLIT_DEPLOYMENT=1` or `REPLIT_PUBLISH_IMAGE_TRIM=1`, which exist only in production. A build failure here is a stop condition with the log tail as evidence; publishing would fail the same way and cost a deploy.

### 5. Publish (MCP)

1. Find the app: `search_apps` with `url: "https://awesome.video"` (or `list_apps`), take its `replId`. Cache nothing across runs; the app is identified by URL.
2. `get_publish_status(replId)` first. If a publish is already in progress, wait for it instead of starting another.
3. `publish_app(replId)`. Observed 2026-10-25: when the dev schema differs from production, it refuses with "applying database changes to the live app needs a review that is only available on the Replit website. Do not retry publish_app". That publish must be done by the user in the Publishing pane (review the schema diff there); later publishes with no schema change work from MCP again. Hand it off once, then go straight to the wait below; do not retry `publish_app`.
4. Wait on the live site, not on Replit's status. `get_publish_status` saying `building` or `running` does not mean the new build is serving, and it cannot see a pending schema review. A foreground `sleep` is blocked, so watch with Monitor (or a background until-loop) that exits when the site serves TARGET:
   ```bash
   prev=""; while true; do v=$(curl -s --max-time 15 https://awesome.video/api/version || true)
     r=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 https://awesome.video/api/health/ready || true)
     [ "$v $r" != "$prev" ] && echo "$(date -u +%H:%M:%S) $v ready=$r"; prev="$v $r"
     case "$v" in *<TARGET>*) [ "$r" = 200 ] && { echo LIVE; exit 0; };; esac; sleep 30; done
   ```
   Typical time is 1–5 minutes; database migrations can add more. Re-arm once at the Monitor timeout; after 30 minutes with no change, go to step 6.

Record each status response verbatim.

### 6. If the publish fails or hangs

Logs are not reachable through any API. Try, in order:
1. `ask_question(replId, "Read the build log and runtime logs of the most recent deployment and quote the first ERROR or FAILED lines verbatim.")`. This is read-only but may cost Agent credits; quote its answer as Agent's claim, not as the log.
2. Reproduce over SSH: rerun step 4, and `ssh awesome-replit 'cd ~/workspace; NODE_ENV=production PORT=5099 timeout 30 node dist/index.js'` to catch startup crashes (missing env, port, migration errors).
3. A stuck publish waiting on the **database conflict dialog** cannot be answered from MCP. Stop and tell the user to open Publishing in Replit and review the schema changes there.

Then stop and report: what failed, at which stage, the evidence, and that production still serves BEFORE (confirm with `curl /api/version`). Never use `update_app_using_prompt` to change code: it starts a paid Agent run that commits in the workspace and diverges it from GitHub.

Without SSH, use the Agent sync in step 2; it is the only exception to the rule above.

### 7. Prove it live

```bash
curl -s https://awesome.video/api/version                 # must equal TARGET
curl -s -o /dev/null -w '%{http_code}\n' https://awesome.video/api/health/ready   # 200
curl -s -o /dev/null -w '%{http_code} %{time_total}\n' https://awesome.video/      # 200
```

If `/api/version` still shows BEFORE right after a "published" status, retry for up to 2 minutes (Autoscale cutover). If it shows neither BEFORE nor TARGET, report it: the workspace HEAD moved during the publish.

Then check the site as a visitor with the project `verify` skill's browser method against `https://awesome.video` (home, a category page, a resource page, search) at 1440×900 and 390×844, reading the console for errors. Do not sign in or write anything on production.

### 8. Report

```
Deploy <BEFORE short> → <TARGET short>: PASS | FAIL | STOPPED
- Workspace sync: ...      (evidence path)
- db:push: ...             (evidence path)
- Build pre-check: ...
- Publish: status sequence, duration
- Live /api/version: ...
- Visitor check: pages + widths driven, console errors
- UNVERIFIED: anything not exercised
Rollback (human, Replit UI): Publishing → History → redeploy the previous build (only the 5 newest builds are kept). Production data is restored separately via Database → point-in-time restore.
```
