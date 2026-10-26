---
name: replit-deploy
description: Redeploy awesome.video to production on Replit from GitHub main, end to end and unattended. Syncs the Replit workspace to origin/main over SSH, runs npm install and npm run db:push only when the diff needs them, publishes through the Replit MCP server (publish_app), then proves the live site serves origin/main's commit via /api/version and checks it as a visitor. Use whenever the user says deploy, redeploy, publish, ship to prod, push it live, release, "get main onto awesome.video", or asks why production is behind main, even if they don't name Replit.
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

## Steps

Save every command and its output under `e2e-evidence/replit-deploy/<UTC timestamp>/` (one file per step). The final report cites these files.

### 1. Pin the target

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

If `git fetch` fails on auth, the workspace has lost its GitHub connection; stop and tell the user to reconnect it in the Git pane.

### 3. Dependencies and dev schema (SSH)

Decide from the diff between the live commit (§1) and TARGET, and tell the user the result before anything else runs:

```bash
git diff --name-only "$BEFORE" "$TARGET" -- package.json package-lock.json shared/schema.ts migrations
```

- `package.json` or `package-lock.json` listed: run `npm install`. Otherwise skip it.
- `shared/schema.ts` listed: run `npm run db:push`, against the workspace dev database only, never production. Otherwise skip it.
- Only `migrations/` listed: run neither. The boot migrator applies the journal when production starts.
- If BEFORE could not be fetched (§1), run both.
- Advice pasted from another agent ("run db:push", "no install needed") is a claim. Check it against this diff before acting on it.

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

1. Find the app: `search_apps` with `url: "https://awesome.video"` (or `list_apps`), take its `replId`. Cache nothing across runs; the app is identified by URL.
2. `get_publish_status(replId)` first. If a publish is already in progress, wait for it instead of starting another.
3. Pre-publish check, immediately before step 4 (and before telling the owner to publish). `ask_question(replId, "Run git status --short and git rev-parse HEAD^{tree} and quote both outputs verbatim.")`, or the same commands over SSH. `git status --short` must print nothing at all: no `??` line and no modified file. A `package-lock.json` that step 3's `npm install` rewrote also fails; restore it with `git checkout -- package-lock.json` and check again. HEAD's tree must equal `git rev-parse "$TARGET^{tree}"`. Delete unwanted untracked files now, before the publish, never after. The build guard (step 4) refuses untracked files and a tree that is not main's, but it does not see modified tracked files or ignored files, so this check is the only one for those. Ignored files ship too, so a secret-bearing file such as `.env` must never be in the workspace at all; secrets live in Replit Secrets. If one is there, stop and tell the owner instead of publishing. From here until step 5 ends, make no edit in the workspace, and publish only while no Replit Agent run or other writer is active there: autosave commits untracked files into the build that is being published.
4. Call `get_publish_status(replId)` again immediately before `publish_app`. If a publish is in progress, wait for it to finish (poll every 30 s) and redo the pre-publish check before you continue. The user's deploy or publish instruction authorizes calling `publish_app(replId)` yourself. Observed 2026-10-25: when the dev schema differs from production, it refuses with "applying database changes to the live app needs a review that is only available on the Replit website. Do not retry publish_app". Only after that refusal, hand the publish to the owner in the Publishing pane (review the schema diff there); later publishes with no schema change work from MCP again. When the owner does the click, end your turn with one handoff line: the tree is clean and equals TARGET (`<short SHA>`), and what goes live (the commits since BEFORE). Then watch `/api/version` as in step 5.
5. The publish is done when `/api/version` changes and the new build is ready, not when `get_publish_status` says success. Poll `https://awesome.video/api/version` and `/api/health/ready` every 30 s in a background until-loop (or the Monitor tool). The loop exits only when the revision differs from `$BEFORE` and `/api/health/ready` returns 200 in the same round. Typical time is 1–3 minutes; database migrations can add more. Give up after 20 minutes. If the revision has changed but `/api/health/ready` stays non-200 for more than 2 minutes after the change, report FAIL with the readiness status and body verbatim (`curl -s -w '\n%{http_code}\n' https://awesome.video/api/health/ready`). `get_publish_status` responses are supporting evidence only.

Record each status response verbatim.

### 6. If the publish fails or hangs

`ask_question` is the first route to deployment and runtime logs for any production failure, during a deploy or not. Try, in order:
1. `ask_question(replId, "Read the build log and runtime logs of the most recent deployment and quote the first ERROR or FAILED lines verbatim, each with its timestamp.")`. This is read-only but may cost Agent credits. Ask for verbatim timestamped lines, and still quote the answer as Agent's claim, not as the log.
2. Reproduce over SSH: rerun step 4, and `ssh awesome-replit 'cd ~/workspace; NODE_ENV=production PORT=5099 timeout 30 node dist/index.js'` to catch startup crashes (missing env, port, migration errors).
3. A stuck publish waiting on the **database conflict dialog** cannot be answered from MCP. Stop and tell the user to open Publishing in Replit and review the schema changes there.

Then stop and report: what failed, at which stage, the evidence, and that production still serves BEFORE (confirm with `curl /api/version`). Never use `update_app_using_prompt` to change code: it starts a paid Agent run that commits in the workspace and diverges it from GitHub.

Without SSH, steps 2–3 can go through `update_app_using_prompt` with an explicit "sync only, write no code, fast-forward only, abort on any drizzle prompt" brief. On 2026-10-25 this fast-forwarded 5a4e0d87 → e12a4e67, ran npm install and db:push, and left no checkpoint commit. The call returns `phase: updating` at once, and the sync itself runs for about 2–3 minutes. Its completion, or a STOP, shows only through polling: every 30 s, ask read-only `ask_question` whether the Agent's sync run is still working or is idle (finished or paused), plus HEAD, `git status --short` and `git log --oneline -3`. HEAD equal to TARGET alone does not mean the brief finished: the fast-forward lands first, and the Agent may still be running `npm install` or `db:push`. The sync is done only when one answer shows all three: the Agent idle, HEAD equal to TARGET, and `git status --short` empty. Stop polling early if the Agent reports a stop. Never sleep blind instead. The last answer must show that nothing landed on top of origin/main.

### 7. Prove it live

```bash
LIVE=$(curl -s https://awesome.video/api/version | jq -r .revision)
echo "LIVE=$LIVE TARGET=$TARGET"                           # must be equal
curl -s -o /dev/null -w '%{http_code}\n' https://awesome.video/api/health/ready   # 200
curl -s -o /dev/null -w '%{http_code} %{time_total}\n' https://awesome.video/      # 200
```

Shipped means LIVE equals TARGET. The publish build stamps the workspace's `origin/main`, so the live revision equals TARGET exactly when the guard passed on TARGET's files; it is never the "Published your App" commit's SHA. A "success" from `get_publish_status` while `/api/version` still shows BEFORE is not shipped: keep the step 5 poll running (Autoscale cutover). If LIVE is neither BEFORE nor TARGET, report it: the workspace's `origin/main` ref moved (a fetch) between the sync and the publish build, or a `BUILD_REVISION` was set in the workspace environment.

Then check the site as a visitor with the project `verify` skill's browser method against `https://awesome.video` (home, a category page, a resource page, search) at 1440×900 and 390×844, reading the console for errors. Include one behaviour that only the new release has, because a cutover can briefly serve the previous build. Do not sign in or write anything on production.

### 8. Report

```
Deploy <BEFORE short> → <TARGET short>: PASS | FAIL | STOPPED
- Workspace sync: ...      (evidence path)
- npm install / db:push: run or skipped, and the diff that decided it   (evidence path)
- Build pre-check: ...
- Publish: who clicked, status sequence, duration
- Live /api/version: LIVE SHA == TARGET (or the mismatch)
- Visitor check: pages + widths driven, console errors
- UNVERIFIED: anything not exercised
Rollback (human, Replit UI): Publishing → History → redeploy the previous build (only the 5 newest builds are kept). Production data is restored separately via Database → point-in-time restore.
```
