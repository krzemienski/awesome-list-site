# Releasing awesome.video

Production is published from this Replit workspace. A release is one pass:

1. **Merge ready** changes into GitHub `main`.
2. **Sync** the workspace to the intended `origin/main`.
3. **Publish once.**
4. **Verify** the version, readiness and the changed behavior.

Each ready logical fix goes through this on its own, promptly. A release is
never held for a batch, an audit pass or an observation window.
`.claude/skills/replit-deploy/SKILL.md` holds the commands and recovery routes;
this page is the contract they implement. An agent publishes with Replit's
`publish_app` tool. When `shared/schema.ts` changed since the live revision,
Replit refuses that tool and the owner publishes from the **Publishing** pane
instead. A release adds no reviewer agent, review pin, verdict, timer, waiting
period, agent or thread count, evidence bundle, paid Agent run or owner-session
preflight of its own. A platform provider's refusal (Replit, GitHub,
Cloudflare, Clerk) is a stop: report it verbatim. The one documented refusal,
the schema review below, is handed to the owner; nothing else is retried or
routed around.

## 1. Merge ready

A change is ready to merge when:

- `npm run build` passes (it runs `tsc --noEmit` before bundling) and
  `npx eslint <touched files>` adds no new errors against the base commit.
  There is no test suite or pre-publish gate.
- Its changed behavior was checked in the running app (browser and API).
- Database migrations in `migrations/` are journaled and idempotent. Publish
  applies the dev schema diff to production and the boot migrator then re-runs
  the same migrations, so a non-idempotent migration fails the publish.
- Address substantive review findings; merge the head you checked.

GitHub permissions and platform-enforced rules apply. This project adds no
reviewer, approval comment, pin, timer or unresolved-thread count. An actual
hook or provider refusal is a stop, not a reason to switch tools.

## 2. Sync and publish once

- **Purpose.** Release a merge only when it has a runtime purpose: it changes
  what production runs, serves, builds or stores (code, config the app reads,
  migrations, dependencies, public assets, a file the server serves), or the
  owner asks for production to carry it. Judge it from the diff and from who
  reads the changed file, not from its extension or directory; if you cannot tell
  whether production reads a file, search for its reader. A change whose only
  effect is on docs, skills, notes or tooling that production never loads has no
  runtime purpose: skip the publish and report "skipped, no runtime purpose".
  Production may then trail `origin/main`, and the next release carries those
  commits.
- **Intended main.** A release ships `origin/main` as fetched at sync time
  (`TARGET`). It must contain the change you merged. Merges that landed before
  the sync ride along; merges that land after it go in the next release.
- **Sync.** Fast-forward the Replit workspace to `TARGET`. Publish snapshots the
  workspace files, not GitHub, so no unintended build input or image content
  may differ. Preserve local work; do not delete files to force a sync. The publish build
  script, `scripts/publish-build.sh`, states what it refuses and why; read it
  rather than this page for its exact checks.
- **Schema review, only when it applies.** It applies when `shared/schema.ts` or
  `migrations/` changed since the live revision. Run `npm run db:push` against
  the dev database only when `shared/schema.ts` changed, stop for the owner on a
  destructive migration (drop, truncate, delete, column type change), and let
  the owner publish from the Publishing pane when Replit refuses `publish_app`
  for the schema diff. No schema change, no review.
- **Publish once.** One `publish_app` call, or one **Publish** click by the
  owner. Replit runs the build (`bash scripts/publish-build.sh`) and starts the
  server with `npm run start`. No separate workspace build, backup, sweep of
  every job type or reviewer runs before it.
- **Jobs.** A restart interrupts in-process jobs (link scans, enrichment,
  research, GitHub sync), and the server fails stranded jobs at its next start.
  For a job you already know is running, look up that one job. If a restart
  would waste real work (a long scan, a paid run), let it finish or ask the
  owner before publishing; never cancel it to publish. Otherwise record it as an
  interruption warning in the report and publish. Do not sweep every job type.
- **Backups.** A publish takes none and needs none. The server takes a scheduled
  daily backup. A manual one is for a QA cleanup batch (the delete route accepts
  only the newest backup, completed no more than 10 minutes ago) or for when the
  owner asks. See `docs/DATABASE-BACKUP.md`.

## 3. Verify

Check in this order and stop on the first failure:

1. **Version.** `https://awesome.video/api/version` returns
   `{"revision":"<TARGET>"}`.
2. **Readiness.** `https://awesome.video/api/health/ready` returns 200.
3. **Changed behavior.** A publish can occasionally leave production on the
   previous commit, and a cutover can briefly serve the old build, so check one
   behavior that only the new commit has (a response field, page copy, a
   header, the changed screen). Drive it the way a person meets it: a browser
   for UI, `curl` for an API, header or server-rendered text.

### Audit and closure are not part of a release

A full production audit and its closure (a clean full pass on one SHA, then the
two-hour window with no error-level log record and no app 5xx; see
`.claude/skills/defect-loop/SKILL.md`) are separate work that runs on request.
They never gate a merge or a publish, and a publish is never held for one. A
publish ends a closure in progress on the older SHA; the audit run records that
and restarts on the live SHA.

## 4. Production QA identity

Production has no throwaway sign-ups: `/sign-up` is behind Cloudflare's
human check and a real emailed code, and the workspace's Clerk keys belong to
the development instance (accounts created with them do not exist on
awesome.video). QA runs use two kept Clerk accounts, the audit admin and the
audit member; their credentials live outside the repo in `~/.cache/awesome-audit/`.

| What you need to check | Identity |
|---|---|
| Public pages, SEO, guest flows, API reads | Signed out. No identity needed. |
| Admin pages and signed-in member features in a browser, and any QA row | The audit admin or audit member account. |
| Admin API calls (targeted job lookups, logs) | The owner admin session: `https://awesome.video/sign-in?admin` + the `OWNER_PASSWORD` secret. It is a signed 12-hour HttpOnly cookie for the `admin@example.com` account, independent of Clerk. |
| The owner's own Clerk account | Signs in with Google or an email code (no password factor). Only the owner can use it. |

Rules for using the owner admin session on production:

1. Agents mint it once per batch and reuse it (owner, 2026-10-30: "you are
   not blocked"; owner, 2026-11-16, delegating this call: "you decide";
   CLAUDE.md, "Production QA conventions"). Anyone
   else gets the owner's go-ahead for each session. It is shared by everyone
   who checks production.
2. Use it for admin API reads and writes only, never in a browser UI. Browser
   journeys use the audit accounts.
3. Never trigger paid AI work: no recommendation Refresh / `?refresh=true`, no
   enrichment or research job starts.
4. Never sign out of this session, with "Sign out" or "Sign out all devices"
   or by calling a sign-out route. It ends every owner session, including
   other people's checks, and the cookie has no per-device identity, so the
   server cannot end only one.
5. Scripts calling admin APIs must send `Origin: https://awesome.video`, or the
   cross-site guard answers 403.

Rules for the audit accounts in a browser:

1. Prefer read-only checks. In an automated browser, abort every non-GET
   `/api` request except the ones the check needs (`POST /api/send` is the
   Replit widget, not the app).
2. If a check must write, keep it net-zero: snapshot the affected state first
   (bookmarks, favorites, journey progress, notification preferences, theme),
   make the change through the UI, undo it the same way, and compare against
   the snapshot. Restore the theme to its exact previous value; to clear it,
   `PUT /api/user/preferences` with `{"themeSystem":null,"themeAccent":null}`
   (both together) and an `Origin: https://awesome.video` header.
3. Never trigger paid AI work (rule 3 above applies here too).

`X-Admin-Audit-Key` (the `ADMIN_PASSWORD` secret) authenticates scripts in
development only. Production's `ADMIN_PASSWORD` is an older value that
publishing does not overwrite, so do not rely on it there.

### Development identities

In the workspace, throwaway members are created through the development Clerk
instance with emails starting `__qa_test_` (verification code `424242`).
Delete them when done: the Clerk user first, then the rows referencing the
local user, then the local `users` row.
