# Releasing awesome.video

The site is published from this Replit workspace. Only the owner publishes.

## 1. Before publishing

- Every change in the release has been checked in the running dev app
  (browser and API). There is no test suite or pre-publish gate.
- Database migrations in `migrations/` are journaled and idempotent. Publish
  applies the dev schema diff to production and the boot migrator then re-runs
  the same migrations, so a non-idempotent migration fails the publish.
- Note the commit you are publishing (`git log --oneline -1`).

## 2. Publish

Use the Replit **Publish** button. The build runs `bash scripts/publish-build.sh`
(`npm run build`, then the publish-image trim); the server starts with
`npm run start`.

## 3. Confirm production runs the new code

`https://awesome.video/api/version` returns `{"revision":"<sha>"}`. A publish
can occasionally leave production on the previous commit, so also check one
behaviour that only the new commit has (a response field, page copy, or a
header) before calling the release live.

## 4. Production QA identity

Production has no throwaway test accounts: `/sign-up` is behind Cloudflare's
human check and a real emailed code, and the workspace's Clerk keys belong to
the development instance (accounts created with them do not exist on
awesome.video).

| What you need to check | Identity |
|---|---|
| Public pages, SEO, guest flows, API reads | Signed out. No identity needed. |
| Admin pages and signed-in member features | The owner admin session: `https://awesome.video/sign-in?admin` + the `OWNER_PASSWORD` secret. It is a signed 12-hour HttpOnly cookie for the `admin@example.com` account, independent of Clerk. |
| The owner's own Clerk account | Signs in with Google or an email code (no password factor). Only the owner can use it. |

Rules for using the owner admin session on production:

1. Get the owner's go-ahead for each session. It is the only production admin,
   and it is shared by everyone who checks production.
2. Prefer read-only checks. In an automated browser, abort every non-GET
   `/api` request except the ones the check needs (`POST /api/send` is the
   Replit widget, not the app).
3. If a check must write, keep it net-zero: snapshot the affected state first
   (bookmarks, favorites, journey progress, notification preferences, theme),
   make the change through the UI, undo it the same way, and compare against
   the snapshot. Restore the theme to its exact previous value; to clear it,
   `PUT /api/user/preferences` with `{"themeSystem":null,"themeAccent":null}`
   (both together) and an `Origin: https://awesome.video` header.
4. Never trigger paid AI work: no recommendation Refresh / `?refresh=true`, no
   enrichment or research job starts.
5. Signing out of this session, with "Sign out" or "Sign out all devices",
   ends every owner session, including other people's checks. The cookie has
   no per-device identity, so the server cannot end only one. Agree a sign-out
   time with anyone else using the session, and sign in again afterwards.
6. Scripts calling admin APIs must send `Origin: https://awesome.video`, or the
   cross-site guard answers 403.

`X-Admin-Audit-Key` (the `ADMIN_PASSWORD` secret) authenticates scripts in
development only. Production's `ADMIN_PASSWORD` is an older value that
publishing does not overwrite, so do not rely on it there.

### Development identities

In the workspace, throwaway members are created through the development Clerk
instance with emails starting `__qa_test_` (verification code `424242`).
Delete them when done: the Clerk user first, then the rows referencing the
local user, then the local `users` row.
