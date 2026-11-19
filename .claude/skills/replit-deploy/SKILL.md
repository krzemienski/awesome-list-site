---
name: replit-deploy
description: Release awesome.video to production on Replit from GitHub main. Syncs the Replit workspace to origin/main over SSH, runs npm install and npm run db:push only when the diff needs them, publishes once through the Replit MCP server (publish_app), then proves /api/version is the published commit, /api/health/ready answers 200 and the changed behavior works. Use when the user says deploy, redeploy, republish, publish, ship to prod, push it live, release, "get main onto awesome.video", "is the published version the latest", or asks why production is behind main; when a successful GitHub main build carries a change production does not yet serve; and when publish_app is refused, the workspace needs syncing, or a "Published your App" commit appears, even if Replit is not named. A main build that only changes docs, skills or notes is not a release unless the owner asks.
---

# Release awesome.video to production

The goal is one observable fact: `https://awesome.video/api/version` returns the commit you published, `/api/health/ready` answers 200, and the merged change works for a visitor. `RELEASE.md` is the contract; this is the short path.

This skill runs only when the operator or an external caller invokes it after a successful, eligible GitHub `main` build that carries a change with a runtime purpose (step 1). It then publishes the verified `origin/main` revision without a separate deploy request. A failed or non-main build is not a release trigger, and neither is a build with no runtime purpose unless the owner asks for it. This skill installs no listener, hook, CI job or scheduler and never starts itself. Never invoke the publisher recursively from Replit's own publish build. If Replit MCP is not mounted in the current client, use the authenticated Replit connector in Claude Code for `get_publish_status` and `publish_app`; honor provider approval prompts and refusals.

Each ready logical fix ships on its own, promptly. A release adds no reviewer, review pin, verdict, timer, agent or thread count, routine backup, sweep of job types, evidence bundle, paid Agent run or extra build. The only backup a release needs is the one before a destructive or ambiguous schema diff (step 3). A full audit and its two-hour closure are separate (`defect-loop`) and never hold a publish. A platform provider's refusal (Replit, GitHub, Cloudflare, Clerk), a hook block and a declined approval are stops: report them verbatim and never retry or route around them.

## What you need

- **Replit MCP authenticated** (`mcp__replit__*` beyond `authenticate`). If only `authenticate` exists, the user runs `/mcp` → replit → Authenticate. After an ECONNREFUSED, `https://mcp.replit.com/server/mcp` answering 401 means the endpoint is up and auth is intact.
- **SSH alias `awesome-replit`**: `ssh -o BatchMode=yes -o ConnectTimeout=20 awesome-replit true` exits 0. To set it up, add `~/.ssh/replit.pub` at replit.com/settings/advanced → SSH keys and copy `HostName` and `User` (the replId) from the project's SSH pane into `~/.ssh/config` (`Port 22`, `IdentityFile ~/.ssh/replit`). If it fails, stop and report: the sync needs SSH, and a paid Agent run is not a substitute.
- **Owner admin session** is not a prerequisite. Mint it only when a step below needs it (a known-job lookup, recovery logs), as `CLAUDE.md` "Production QA conventions" says.

Run commands one statement per call with literal SHAs; shell variables do not survive between calls. Report what you ran and saw in your reply; no evidence folder is required.

## 1. Target and purpose

```bash
git fetch origin
git rev-parse origin/main                                    # TARGET
curl -s https://awesome.video/api/version | jq -r .revision  # BEFORE, the live SHA
git diff --name-status '<BEFORE>' '<TARGET>'
```
If BEFORE is not in the local clone, `git fetch origin <BEFORE>`, then `git fetch awesome-replit:workspace '+refs/heads/*:refs/remotes/replit-ws/*'` (older live commits exist only in the workspace). If neither yields it, the comparison is UNVERIFIED: say so, and never call production behind on SHAs alone.

- **Nothing to do.** BEFORE equals TARGET, or their trees are equal.
- **No runtime purpose: skip the publish.** Read the diff, not the file names. Publish only when something in it changes what production runs, serves, builds or stores (code, config the app reads, migrations, dependencies, public assets), or the owner asks for production to carry it. Docs, skills and notes alone do not, so production may legitimately trail `origin/main` by such commits; the next release ships them. Do not decide by extension or directory. If you cannot tell whether the code reads a file, search for its reader first. A skipped release is not a deploy: report SKIPPED, say production still serves BEFORE, and never call it current with `origin/main` or TARGET.
- **Runtime purpose: continue.** Check GitHub for TARGET (`gh run list --branch main --limit 5`; an empty list is normal, the repo defines no workflows). A failed build or required check on TARGET is a stop, and shipping it is the owner's decision.

If audit lanes or an observation window are running on BEFORE, tell them the revision will change (evidence is valid only for its stamped revision) and publish. Never wait for them.

## 2. Sync the workspace

Publish snapshots the **workspace files**, git-ignored ones included, not GitHub. SSH lands in the container; the repo root holds `.replit` (normally `~/workspace`). The project hook `scripts/hooks/prod-write-guard.mjs` asks a person before any argument-bearing `ssh awesome-replit` command; with nobody at the prompt that is a block, so report it.

```bash
ssh awesome-replit 'set -e; cd ~/workspace; git status --porcelain; git rev-parse --abbrev-ref HEAD; git fetch origin main; git log --oneline origin/main..HEAD'
```
Stop on modified tracked inputs, an unexpected snapshot file, a branch other than `main`, or unexplained workspace-only commits. Do not delete, restore or stash another writer's files. The only commit exception is a verified empty Replit publish commit: first verify that another ref preserves it and its tree equals its parent's; then `git reset --keep origin/main` can move `main`. Never use `--hard`.

Otherwise `ssh awesome-replit 'set -e; cd ~/workspace; git merge --ff-only origin/main; git rev-parse HEAD'`. The printed HEAD is what ships; if `origin/main` moved after step 1, go back to step 1 with the new SHA. If `git fetch` fails on auth, the workspace lost its GitHub connection: stop and tell the user to reconnect it in the Git pane.

## 3. Install and schema, only when the diff says so

```bash
git diff --name-only '<BEFORE>' '<TARGET>' -- package.json package-lock.json shared/schema.ts migrations
git diff -U0 '<BEFORE>' '<TARGET>' -- migrations | rg -i '^\+[^+]' | rg -iv '^\+\s*--' | rg -i 'drop |alter column .* type|truncate|delete from'
```
(the second command exits 1 when nothing matches, which is the good result)

- `package.json` or `package-lock.json` listed: run nothing in the workspace. The publish build (`scripts/publish-build.sh`) does the clean lockfile install; a second `npm ci` or `npm install` here duplicates it and can alter tracked inputs.
- `shared/schema.ts` listed: run `npm run db:push` in the workspace against the dev database only, after `test -n "$DATABASE_URL"` (never print it). If drizzle-kit asks anything, stop; never add `--force`. Replit will refuse `publish_app` for this diff, so tell the owner now that they publish from the Publishing pane and report the diff lines.
- Only `migrations/` listed: run neither; the boot migrator applies them.
- **Destructive or ambiguous diff.** The git diff is only a hint; the actual diff in the Publishing pane decides. If it (or the second command above) shows a drop, truncate, delete or column type change, or you cannot read it with certainty, then even when the git diff looked safe: (1) take a production backup for this change (`POST /api/admin/database-backups`, owner session, `Origin` header, body `{}`) and confirm it is the newest, `inFlight` is false, `completedAt` is later than the request, and its stored checksum and size are recorded (a row count alone does not prove recoverability; no restore is run); if a relevant production write lands before approval, take another; (2) stop and report the diff for human review, and apply only after the owner says so. A backup that is missing, stale, failing or unverifiable means do not apply: report it and wait. A routine code-only release or a plainly additive diff needs no backup.
- If BEFORE could not be fetched, treat the schema as changed.

An empty Git diff never overrides an actual Publishing-pane diff.

## 4. Check the workspace, then publish once

```bash
ssh awesome-replit 'cd ~/workspace; git status --short; git rev-parse "HEAD^{tree}"'
```
Verify the tree equals `git rev-parse '<TARGET>^{tree}'` and the workspace contains the intended build inputs. Only positively identified inert artifacts excluded from the published contents may differ. An unknown or secret-bearing file is a stop, not permission to delete it. Ignored files also enter Replit's snapshot. Use Replit Secrets, never print environment values, and allow no concurrent workspace writer until the snapshot is taken.

**A known running job.** A publish restarts the server and kills in-process jobs (link scans, enrichment, research, GitHub sync). Only for a job you already know is running (you or a lane started it, or the owner or a lane's notes named it), look up that one job with the owner session: `GET /api/admin/link-health/status` (`.job.status`), `GET '/api/enrichment/jobs?limit=5'` or `GET '/api/researcher/jobs?limit=5'` (`.jobs[].status`), `GET '/api/github/sync-status?status=processing'` (`.items`). `pending` or `processing` means running. A 401, a 5xx or an unreadable body is unknown, not idle. If a restart would waste real work (a long scan, a paid run), handle that job before publishing: let it finish or ask the owner. Never cancel it to publish. Otherwise name it as an interruption warning in the report and go on. Do not sweep job endpoints you have no reason to check.

Find the app: `search_apps` by URL returns `[]`. Use the replId from the SSH config's `User` (`ssh -G awesome-replit | awk '/^user /{print $2}'`) and confirm with `get_publish_status(replId)` that it serves https://awesome.video. The `deploymentId` it returns is a different UUID; do not pass it as `replId`. If a publish is already running, wait for it instead of starting another, then redo this step.

Call `publish_app(replId)` **once**. The user's deploy or publish instruction authorizes it; a successful `main` build trigger does too. Never call it again after a failed or unclear result, and never while another publish runs. If step 3 found a schema change, do not call it: the owner clicks Publish. When Replit refuses with "applying database changes to the live app needs a review that is only available on the Replit website", hand the publish to the owner and end your turn with one line: the tree is clean and equals TARGET `<short SHA>`, and what goes live (the commits since BEFORE). Any other refusal or approval prompt from Replit is a stop.

## 5. Verify

The publish is done when `/api/version` changes and the build is ready, not when `get_publish_status` says success. Check every 30 s (a foreground `sleep` is blocked, so use the Monitor tool; this loop ends with the publish) until `/api/version` returns TARGET and `/api/health/ready` answers 200 in the same round. Typical time is 1–3 minutes; give up after 20. A revision that changed while readiness stays non-200 for over 2 minutes is a FAIL: report the status and body verbatim.

Then **the changed behavior**: name one behavior only the new commit has, from the merged change's own claim (a response field, page copy, a header, the changed screen), and drive it the way a person meets it. Use `curl` for an API, header or SSR text, and a browser for UI at the width the change concerns (read `innerWidth` back, wait for `#ssr-seo-hold` to go and `#root` to fill, never wait for network idle, set `analytics-consent=denied` and `umami.disabled=1` first, read the console). A cutover can briefly serve the old build, so check again before calling a FAIL. This writes nothing on production and signs nobody in.

Only when the release touches that area:
- **Sign-in or session code** (`useAuth`, `clerkAuth`, admin cookies, ClerkProvider): prove `/admin` in a browser as the audit admin (route in `qa-lane`; never click Sign out) in three states: fresh profile, valid cookie with localStorage cleared, valid cookie with stale localStorage. Check the owner cookie by API only (`GET /api/admin/stats` answers 200), never in a browser.
- **Host or redirect handling**: `curl -sSI https://www.awesome.video/` must answer one 301 to `https://awesome.video/`. That is a Cloudflare zone rule; fix it with the Cloudflare plugin's API, not as an owner chore.

Shipped means LIVE equals the exact intended TARGET SHA, readiness is 200 and the changed behavior works. Claim "current with `origin/main`" only when LIVE equals `origin/main`; after a skipped docs-only release it does not. If LIVE is neither BEFORE nor TARGET, report it.

## If the publish fails or hangs

1. Read the app's own logs: `GET '/api/admin/logs?since=-60m&limit=500'` with the owner session (`since` takes an ISO time or `-60m`, plus `until`, `level`, `area`, `q`; max `limit` 2000). They miss the build log and any crash before the logger starts.
2. For those, `ask_question(replId, "Read the build log and runtime logs of the most recent deployment and quote the first ERROR or FAILED lines verbatim, each with its timestamp.")`, one question at a time (a second returns "Agent busy"). It is read-only but may cost Agent credits; quote the answer as Agent's claim.
3. Reproduce over SSH, only now: `ssh awesome-replit 'set -o pipefail; cd ~/workspace; timeout 900 bash scripts/publish-build.sh 2>&1 | tail -80'; echo "exit=$?"` (`exit=0` is the only pass), and `ssh awesome-replit 'cd ~/workspace; NODE_ENV=production PORT=5099 timeout 30 node dist/index.js'` for startup crashes. Read what `scripts/publish-build.sh` itself says about a refusal; fix the sync, never edit the script to publish.
4. A publish stuck on the database conflict dialog cannot be answered from MCP: tell the owner to review the schema changes in Publishing.

Then stop and report what failed, at which stage, the evidence, and that production still serves BEFORE (`/api/version`). Fix the cause on GitHub `main` and release again; do not publish blindly. Never use `update_app_using_prompt` to change code or to sync: it starts a paid Agent run that commits in the workspace and diverges it from GitHub.

After any publish, `git fetch` locally and in the workspace before you branch or merge, because `origin/main` may have gained the publish commit. When `main` is checked out in another worktree, merge with `gh api repos/<owner>/<repo>/pulls/<N>/merge -X PUT -f merge_method=squash -f sha=<head>`; GitHub answers 409 if the branch moved.

## Report

```
Release <BEFORE short> → <TARGET short>: PASS | FAIL | STOPPED | SKIPPED (no runtime purpose)
- Merged: the PRs or commits this release ships
- Sync, install, schema: what ran or was skipped, and the diff that decided it
- Known running job: none known | handled: <job> | interruption warning: <job> | unreadable: <lookup>
- Publish: who published, status sequence, duration
- Live: /api/version == TARGET, /api/health/ready 200
- Changed behavior: what was checked and how
- UNVERIFIED: anything not exercised
Rollback (human, Replit UI): Publishing → History → redeploy the previous build (only the 5 newest builds are kept). Production data is restored from the app backup with `npm run db:backup -- restore <id>` into an empty database; Replit's point-in-time restore covers the development database only.
```
