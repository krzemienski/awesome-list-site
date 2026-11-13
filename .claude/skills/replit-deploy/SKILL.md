---
name: replit-deploy
description: Redeploy awesome.video to production on Replit from GitHub main, end to end and unattended. Syncs the Replit workspace to origin/main over SSH, runs npm install and npm run db:push only when the diff needs them, publishes through the Replit MCP server (publish_app), then proves the live site serves origin/main's commit via /api/version and checks it as a visitor. Use whenever the user says deploy, redeploy, republish, publish, ship to prod, push it live, release, "get main onto awesome.video", "is the published version the latest", or asks why production is behind main; and whenever a verified, merged fix batch leaves /api/version behind origin/main, publish_app is refused, the Replit workspace needs syncing, or a "Published your App" commit appears, even if they don't name Replit.
---

# Redeploy awesome.video from GitHub main

The goal is one observable fact: `https://awesome.video/api/version` returns `{"revision":"<origin/main SHA>"}` and the site works for a visitor. Everything below serves that.

Run unattended. Stop and report only on the stop conditions named in each step; never "fix" them by force, because each one means production could lose data or ship code nobody reviewed.

## How the pieces fit (why the steps are ordered this way)

- Publishing snapshots the **Replit workspace files**, git-ignored ones included, not GitHub. So the workspace must be at origin/main before you publish, and secrets live in Replit Secrets, never in a workspace file such as `.env`. There is no CLI, REST API or GitHub-triggered deploy; MCP `publish_app` is the only programmatic trigger.
- The publish build (`scripts/publish-build.sh`) refuses to build unless `HEAD`'s tree equals `origin/main`'s and no untracked files exist, then stamps `BUILD_REVISION=$(git rev-parse origin/main)` into the bundle (an explicit `BUILD_REVISION` in the environment wins), and `/api/version` serves it. So the live revision equals the GitHub main SHA exactly when the guard passed, even though `HEAD` may be an empty "Published your App" commit. Plain `npm run build` stamps `HEAD`.
- The guard does not check modified tracked files or ignored files, so the workspace must still be clean by hand (step 5).
- Builds of commits without the guard (it landed in 12fc7fc9, #46) stamped the workspace `HEAD`, which could be the empty "Published your App" commit or an autosave commit (Replit's autosave commits untracked files into the build). When BEFORE is such a commit, compare its tree with main's, not its SHA (step 1).
- At publish, Replit diffs the **dev database schema against production** and applies the difference (drizzle-kit based, with a conflict dialog for destructive changes). `npm run db:push` on the dev DB therefore decides the production schema of the next publish.
- Agent checkpoints, Monitoring Auto-fix and Agent task merges commit inside the workspace. Those commits are not on GitHub, which is the usual cause of divergence.
- `.replit` `[deployment]`: Autoscale, build `bash scripts/publish-build.sh`, run `npm run start`, port 5000 → 80. The homepage must answer within 5 s or Promote fails.

## Prerequisites (one-time, human)

Check these first; if one is missing, stop and tell the user exactly which, because no later step works without them.

1. **Replit MCP authenticated.** `mcp__replit__*` tools beyond `authenticate` are available. If only `authenticate`/`complete_authentication` exist, the user must run `/mcp` → replit → Authenticate → choose workspace → Allow. Before asking for re-auth after an ECONNREFUSED or "not connected", probe: `curl -sS -o /dev/null -w '%{http_code}' https://mcp.replit.com/server/mcp` returning 401 means the endpoint is reachable and auth is intact; a resolve failure while `dig +short mcp.replit.com @1.1.1.1` answers is a local DNS blip that usually clears in minutes.
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

   Run this check first on every deploy. If it fails, the deploy still goes ahead: steps 2–3 use the **Agent sync** (end of step 6) instead of SSH. Tell the user once that SSH is down, because every Agent sync is a paid Agent run.
3. **Owner admin session.** `curl -s -o /dev/null -w '%{http_code}' -H @"$HOME/.cache/awesome-audit/owner.hdr" https://awesome.video/api/admin/stats` must print 200: steps 5.3a and 5.3b need it. On 401, hand the owner `! bash ~/.cache/awesome-audit/refresh-owner.sh` at the start, before the sync, not mid-deploy (the agent cannot read `.env`). Every admin POST, PUT or DELETE also needs `-H 'Origin: https://awesome.video'`: a 403 means that header is missing, a 401 means the session or password is wrong.

## Steps

Save every command and its output under `e2e-evidence/replit-deploy/<UTC timestamp>/` (one file per step). The final report cites these files.

### 1. Pin the target

First check whether a final pass or a timed observation window (the 2-hour no-5xx window, a 24-hour reading) is running on the live SHA. A publish voids that pass and restarts the window. If the diff since BEFORE is docs or reports only, do not publish: hold the docs PR until the next code batch, or say which window the publish resets. Merge run reports before the last code deploy, not after it.

```bash
git fetch origin
TARGET=$(git rev-parse origin/main)
BEFORE=$(curl -s https://awesome.video/api/version | jq -r .revision)   # the live SHA
echo "TARGET=$TARGET BEFORE=$BEFORE"
git cat-file -e "$BEFORE^{commit}" 2>/dev/null || git fetch origin "$BEFORE" \
  || git fetch awesome-replit:workspace '+refs/heads/*:refs/remotes/replit-ws/*'
git rev-parse "$BEFORE^{tree}" "$TARGET^{tree}"
```
Every later block uses `$TARGET`, `$BEFORE` and `$LIVE`. Shell variables do not survive between separate shell calls, so set them again (from the SHAs echoed here) in each new shell. A live commit from before the guard is often only in the workspace, so the last fetch pulls the workspace branches over SSH. Production is current when `$BEFORE` equals `$TARGET` or the two trees are equal; then say so and stop unless the user asked for a forced republish. If neither fetch yields a live commit that differs from TARGET, the comparison is UNVERIFIED: report it as such and never call production behind on SHAs alone.

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
  - The publish commit is the one exception. Every publish adds an empty "Published your App" commit (author Replit Agent) on top of the published HEAD. When origin/main already contains it (Replit sometimes pushes it), `origin/main..HEAD` is empty and the plain fast-forward below works. When it is the only workspace-only commit, `git rev-parse <it>^{tree} <it>^^{tree}` prints the same tree twice (it changes no files), and `git branch -a --contains <it>` shows it kept on `replit-agent` / `gitsafe-backup/main`, move main with `git reset --keep origin/main` instead of `--ff-only`. Anything else is still a stop.

Otherwise fast-forward only:
```bash
ssh awesome-replit 'set -e; cd ~/workspace; git merge --ff-only origin/main; git rev-parse HEAD'
```
The printed HEAD must equal TARGET.

After any publish, run `git fetch` (locally and in the workspace) before you branch, merge or create a worktree, because origin/main may have gained the publish commit.

When `main` is checked out in another worktree, `gh pr merge` fails; merge with `gh api repos/<owner>/<repo>/pulls/<N>/merge -X PUT -f merge_method=squash --jq .sha`.

If `git fetch` fails on auth, the workspace has lost its GitHub connection; stop and tell the user to reconnect it in the Git pane.

### 3. Dependencies and dev schema (SSH)

Decide from the diff between the live commit (§1) and TARGET, and tell the user the result before anything else runs:

```bash
git diff --name-only "$BEFORE" "$TARGET" -- package.json package-lock.json shared/schema.ts migrations   # what to install / push
```

- `package.json` or `package-lock.json` listed: run `npm install`. Otherwise skip it.
- `shared/schema.ts` listed: run `npm run db:push`, against the workspace dev database only, never production. Otherwise skip it. A schema change also means `publish_app` will be refused (step 5), so tell the user now, before the sync, that they will review and publish this one in the Publishing pane.
- Only `migrations/` listed: run neither. The boot migrator applies the journal when production starts. Still record it, and run the destructive check below.
- If BEFORE could not be fetched (§1), run both, and treat the schema as changed.
- Advice pasted from another agent ("run db:push", "no install needed") is a claim. Check it against this diff before acting on it.

Pre-publish schema diff (#78). `publish_app` is refused whenever the dev schema differs from production, and `get_publish_status` cannot show that a review is pending, so find out now:

```bash
git diff --name-status "$BEFORE" "$TARGET" -- shared/schema.ts migrations
git diff -U0 "$BEFORE" "$TARGET" -- migrations | rg -i "^\+[^+]" | rg -iv "^\+\s*--" | rg -i "drop |alter column .* type|truncate|delete from"   # destructive check: added lines only, SQL comments excluded
```
- Empty: no schema change; MCP publish is allowed.
- `shared/schema.ts` listed (any status A/M/D): the owner publishes from the Publishing pane. Tell them before the sync and report the diff lines so they can review the dialog. The backup in step 5.3b still runs first.
- The destructive check exits 1 when nothing matches, which is the good result: do not run it under `set -e`.
- Any destructive migration (a drop, truncate, delete or column type change, per the second command): **STOP**, report the statements, and wait for the owner.
- Record the result for step 8's `Schema:` line.

```bash
ssh awesome-replit 'set -e; cd ~/workspace; npm install'                 # only when needed
```

Only when `shared/schema.ts` changed, run db:push. The `DATABASE_URL` presence check belongs to this branch, so a deploy that skips db:push skips the check too:

```bash
ssh awesome-replit 'cd ~/workspace
test -n "$DATABASE_URL" || { echo "DATABASE_URL unset"; exit 1; }
echo DATABASE_URL=set; timeout 300 npm run db:push 2>&1'
```

- Never print `DATABASE_URL` or any secret value; test presence only. If it is unset in the SSH session, secrets are not exported there; stop and report, because db:push would target nothing.
- If drizzle-kit asks a question (data loss, truncation, rename vs create) or times out waiting for input, **stop**. Do not add `--force` or answer it: the same diff will be applied to production at publish. Report the statements it wanted to run.
- `npm install` may rewrite `package-lock.json` (Replit's internal registry). Re-run `git status --porcelain`; if anything changed, report it but do not commit it. Step 5's pre-publish check restores it.

### 4. Build pre-check (SSH)

```bash
ssh awesome-replit 'set -o pipefail; cd ~/workspace; timeout 900 bash scripts/publish-build.sh 2>&1 | tail -80'; echo "exit=$?"
```
Check the exit status, not only the log tail: `exit=0` is the only pass. `pipefail` makes the script's failure the command's status instead of `tail`'s.

The build first fails unless `HEAD`'s tree equals `origin/main`'s, printing the differing files, and then fails if any untracked file exists, listing them. Either failure means step 2 left the workspace off main, so fix the sync (delete stray untracked files) and never edit the guard to publish. On success it prints `stamping BUILD_REVISION=<sha>`; that SHA must equal TARGET.

Safe in the workspace: the image-trim step runs only when `REPLIT_DEPLOYMENT=1` or `REPLIT_PUBLISH_IMAGE_TRIM=1`, which exist only in production. A build failure here is a stop condition with the log tail as evidence; publishing would fail the same way and cost a deploy.

### 5. Publish (MCP)

Before publishing, list the live audit lanes and tell each that the revision is about to change (pause it or note it per row), and stamp the revision on each row. Evidence is valid only for its stamped revision.

1. Find the app: `search_apps` by URL returns `[]` (2026-11-06), and a name search ("Awesome Video") also returns look-alike apps. Search by name, or take the replId from the `awesome-replit` SSH user (`ssh awesome-replit 'echo $REPL_ID'`), then confirm with `get_publish_status(replId)` that the deployment serves https://awesome.video before any publish. Cache nothing across runs. The `deploymentId` that `get_publish_status` returns is a different UUID from the replId; passing it as `replId` fails with "No Replit app matched this ID". The replId is the `User` value in the SSH config: `ssh -G awesome-replit | awk '/^user /{print $2}'`.
2. `get_publish_status(replId)` first. If a publish is already in progress, wait for it instead of starting another.
3. Pre-publish check, immediately before step 3a (and before telling the owner to publish). `ask_question(replId, "Run git status --short and git rev-parse HEAD^{tree} and quote both outputs verbatim.")`, or the same commands over SSH. `git status --short` must print nothing at all: no `??` line and no modified file. A `package-lock.json` that step 3's `npm install` rewrote also fails; restore it with `git checkout -- package-lock.json` and check again. HEAD's tree must equal `git rev-parse "$TARGET^{tree}"`. Delete unwanted untracked files now, before the publish, never after. The build guard (step 4) refuses untracked files and a tree that is not main's, but it does not see modified tracked files or ignored files, so this check is the only one for those. Ignored files ship too, so no secret-bearing file may be in the workspace; secrets live in Replit Secrets. A workspace `.env` (gitignored, not in the repo) may hold only the mirror of public `VITE_*` config (#273): check its key names only (`cut -d= -f1 .env`, never the values) and stop only if a secret key name (a password, token, key or `DATABASE_URL`) appears. From here until step 5 ends, make no edit in the workspace, and publish only while no Replit Agent run or other writer is active there: autosave commits untracked files into the build that is being published.
3a. (Step 5.3a) Running-jobs check, immediately before step 4 and again after any wait in step 4. A deploy restarts the instance and kills in-process scans (three jobs died "Interrupted by server restart"). Paste this as its own shell call (the `exit 1` ends that shell); it uses the cached owner header file and never prints it. Every probe fails closed:

```bash
H="$HOME/.cache/awesome-audit/owner.hdr"; B=https://awesome.video; busy=0
probe(){ out=$(curl -sf -H @"$H" "$B$2" | jq -r "$3") || { echo "STOP: $1 probe failed (401/5xx/bad JSON)"; busy=1; return; }
  [ "$out" = "0" ] && echo "ok   $1" || { echo "STOP: $1 running or unreadable ($out)"; busy=1; }; }
LIST='if (.jobs|type)!="array" then "bad-shape" elif ([.jobs[]|select(.status==null)]|length)>0 then "null-status" else [.jobs[]|select(.status=="pending" or .status=="processing")]|length end'
probe link-scan  /api/admin/link-health/status '.job as $j | if $j==null then 0 elif ($j.status|type)!="string" then "null-status" elif ($j.status=="pending" or $j.status=="processing") then 1 else 0 end'
probe enrichment "/api/enrichment/jobs?limit=5" "$LIST"
probe researcher "/api/researcher/jobs?limit=5" "$LIST"
GH='if (.items|type)!="array" then "bad-shape" else (.items|length) end'
probe github-pending    "/api/github/sync-status?status=pending" "$GH"
probe github-processing "/api/github/sync-status?status=processing" "$GH"
probe backup /api/admin/database-backups 'if (.inFlight|type)!="boolean" then "bad-shape" elif .inFlight then 1 else 0 end'
[ "$busy" = 0 ] && echo "ALL CLEAR" || { echo "STOPPED: do not publish; ask the owner"; exit 1; }
```
Any `STOP` line means: do not publish. Report the job id and `createdAt` and ask the owner. Never cancel a job to proceed. A 401 on any probe is also a STOP (idle cannot be proven).

3b. (Step 5.3b) Fresh backup, after 3a passes and immediately before step 4. The owner's standing approval (PLAN decision 17) allows exactly one `POST /api/admin/database-backups` per deploy, only after the schema and running-jobs checks pass and just before `publish_app`. Send it as `curl -X POST -H @owner.hdr -H 'Origin: https://awesome.video' -H 'Content-Type: application/json' -d '{}' .../api/admin/database-backups`. It creates a backup and changes no site data; it covers no restore, no deletion and no other POST. Then check, via `GET /api/admin/database-backups` (newest first):
   1. The POST returned 201 and its id is the first list entry (409 means one is in flight: wait and re-run 3a).
   2. The newest `completedAt` is under 10 minutes old.
   3. `tableCount` is at least 42 and `totalRows` is at least 99 % of the previous backup's. `agent_events` grows quickly, so a longer gap can add rows legitimately; a drop is the failure.
   4. No backup is in flight (`inFlight` is false after the POST completes).
   STOP (do not publish) on every one of: a failed POST (not 201); newest `completedAt` 10 minutes old or more; a backup still in flight; `tableCount` under 42; `totalRows` below 99 % of the previous backup (a row drop). Growth above the window is not a STOP: report it. Record `Backup: <id>, <rows>, <age> min, rows vs previous <+x.x%>` for step 8.
4. Call `get_publish_status(replId)` again immediately before `publish_app`. If a publish is in progress, wait for it to finish (poll every 30 s) and redo the pre-publish check, 5.3a and 5.3b (a fresh backup, since the old one is now stale) before you continue. The user's deploy or publish instruction authorizes calling `publish_app(replId)` yourself. Observed 2026-10-25: when the dev schema differs from production, it refuses with "applying database changes to the live app needs a review that is only available on the Replit website. Do not retry publish_app". Only after that refusal, hand the publish to the owner in the Publishing pane (review the schema diff there); later publishes with no schema change work from MCP again. When the owner does the click, end your turn with one handoff line: the tree is clean and equals TARGET (`<short SHA>`), and what goes live (the commits since BEFORE). Then watch `/api/version` as in step 5.
5. The publish is done when `/api/version` changes and the new build is ready, not when `get_publish_status` says success (or `building` / `running`, which only mean Replit is still working). Poll `https://awesome.video/api/version` and `/api/health/ready` every 30 s in a background until-loop (or the Monitor tool); a foreground `sleep` is blocked by the harness. The loop exits only when the revision differs from `$BEFORE` and `/api/health/ready` returns 200 in the same round. Typical time is 1–3 minutes; database migrations can add more. Give up after 20 minutes. If the revision has changed but `/api/health/ready` stays non-200 for more than 2 minutes after the change, report FAIL with the readiness status and body verbatim (`curl -s -w '\n%{http_code}\n' https://awesome.video/api/health/ready`). `get_publish_status` responses are supporting evidence only.

Record each status response verbatim.

### 6. If the publish fails or hangs

For runtime logs, first query the app's own sink: `curl -s -H @owner.hdr "https://awesome.video/api/admin/logs?since=-60m&limit=500"` (`since` takes an ISO time or `-60m`, plus `until`, `level`, `area`, `q`; always pass `limit`, max 2000; records carry `_time`, `level`, `area`, `instance`, `message`). It does not see the build log or a crash before the logger starts. For those, `ask_question` is the next route, during a deploy or not. It takes one question at a time: while one runs, another returns "Agent busy, NOT submitted". Merge related questions into one call, wait for its answer, and resend anything that came back NOT submitted. Try, in order:
1. `ask_question(replId, "Read the build log and runtime logs of the most recent deployment and quote the first ERROR or FAILED lines verbatim, each with its timestamp.")`. This is read-only but may cost Agent credits. Ask for verbatim timestamped lines, and still quote the answer as Agent's claim, not as the log.
2. Reproduce over SSH: rerun step 4, and `ssh awesome-replit 'cd ~/workspace; NODE_ENV=production PORT=5099 timeout 30 node dist/index.js'` to catch startup crashes (missing env, port, migration errors).
3. A stuck publish waiting on the **database conflict dialog** cannot be answered from MCP. Stop and tell the user to open Publishing in Replit and review the schema changes there.

Then stop and report: what failed, at which stage, the evidence, and that production still serves BEFORE (confirm with `curl /api/version`). Never use `update_app_using_prompt` to change code: it starts a paid Agent run that commits in the workspace and diverges it from GitHub. The Agent sync below is its one sanctioned use.

**Agent sync.** Without SSH, steps 2–3 go through `update_app_using_prompt` with an explicit "sync only, write no code, fast-forward only (or `git reset --keep origin/main` past an empty Published your App commit, after checking it changes no files), npm install and db:push only as the step-3 diff decides, abort on any drizzle prompt, no checkpoint or lockfile commit" brief. On 2026-10-25 this fast-forwarded 5a4e0d87 → e12a4e67, ran npm install and db:push, and left no checkpoint commit. The call returns `phase: updating` at once, and the sync itself runs for about 2–3 minutes. Its completion, or a STOP, shows only through polling: every 30 s, ask read-only `ask_question` whether the Agent's sync run is still working or is idle (finished or paused), plus HEAD, `git status --short` and `git log --oneline -3`. HEAD equal to TARGET alone does not mean the brief finished: the fast-forward lands first, and the Agent may still be running `npm install` or `db:push`. The sync is done only when one answer shows all three: the Agent idle, HEAD equal to TARGET, and `git status --short --untracked-files=all` empty. `ask_question` answers are Agent's own report, so ask for the commands' verbatim output, not a summary. Stop polling early if the Agent reports a stop. Never sleep blind instead. The last answer must show that nothing landed on top of origin/main.

### 7. Prove it live

Also check the www host: `curl -sSI https://www.awesome.video/` must answer one 301 whose `location` is `https://awesome.video/` (a scheme-less target loops). The redirect is a Cloudflare zone rule; fix it with the Cloudflare plugin's API, not as an owner chore.

```bash
LIVE=$(curl -s https://awesome.video/api/version | jq -r .revision)
echo "LIVE=$LIVE TARGET=$TARGET"                           # must be equal
curl -s -o /dev/null -w '%{http_code}\n' https://awesome.video/api/health/ready   # 200
curl -s -o /dev/null -w '%{http_code} %{time_total}\n' https://awesome.video/      # 200
```

If the release touches client sign-in or session code (`useAuth`, `clerkAuth`, admin cookies, ClerkProvider), prove `/admin` for an already signed-in owner in three states: a fresh browser profile, a valid session cookie with localStorage cleared, and a valid cookie with stale localStorage from the previous build. Each must load the dashboard. A PR note such as "log in again once" is an open FAIL, not a caveat (#289 shipped that way and broke /admin; #298 fixed it).

Shipped means LIVE equals TARGET. The publish build stamps the workspace's `origin/main`, so the live revision equals TARGET exactly when the guard passed on TARGET's files; it is never the "Published your App" commit's SHA. A "success" from `get_publish_status` while `/api/version` still shows BEFORE is not shipped: keep the step 5 poll running (Autoscale cutover). If LIVE is neither BEFORE nor TARGET, report it: the workspace's `origin/main` ref moved (a fetch) between the sync and the publish build, or a `BUILD_REVISION` was set in the workspace environment.

Then check the site as a visitor in a browser against `https://awesome.video` (home, a category page, a resource page, search):

1. Emulate three viewports, 1280, 768 and 390 wide (390 as mobile with touch), reload, and read `innerWidth` back before judging any layout.
2. Wait until `#ssr-seo-hold` is gone and `#root` has children, then wait for expected text. Never wait for network idle: some pages keep a connection open.
3. Add an init script that sets `analytics-consent=denied` in localStorage and `umami.disabled=1`, so the consent bar and analytics stay out of the way.
4. Read the browser console for errors on each page.

Include one behaviour that only the new release has, because a cutover can briefly serve the previous build. Do not sign in or write anything on production.

### 8. Report

```
Deploy <BEFORE short> → <TARGET short>: PASS | FAIL | STOPPED
- Workspace sync: ...      (evidence path)
- npm install / db:push: run or skipped, and the diff that decided it   (evidence path)
- Schema: empty | migrations-only | schema.ts changed (publish route)
- Running jobs: none | STOPPED: <job>
- Backup: <id>, <rows>, <age> min, rows vs previous <+x.x%>
- Build pre-check: ...
- Publish: who clicked, status sequence, duration
- Live /api/version: LIVE SHA == TARGET (or the mismatch)
- Visitor check: pages + widths driven, console errors
- UNVERIFIED: anything not exercised
Rollback (human, Replit UI): Publishing → History → redeploy the previous build (only the 5 newest builds are kept). Replit's point-in-time restore is documented for the development database only; production data is restored from the app backup with `npm run db:backup -- restore <id>` into an empty database.
```
