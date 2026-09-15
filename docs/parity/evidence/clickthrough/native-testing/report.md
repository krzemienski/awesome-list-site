# Native click-through verification — first native run (superseded)

> **Superseded on 2026-09-15** by
> [clickthrough-2026-09-15.md](clickthrough-2026-09-15.md). The "admin
> UNABLE" outcome below was an infrastructure blocker of *this* run (Clerk
> provisioning 401 from the tester notebook). The later run provisioned the
> admin through the `__clerk_ticket` sign-in path and completed the full
> admin path, the submit→approve→net-zero proof, the keyboard pass and the
> per-screen censuses. The visitor PASS below remains valid and is reused.

Status at the time of this run: **visitor PASS / admin UNABLE**. This report
records that native browser verification only. It is not an exhaustive
census, a full-suite result, or a claim that every control/row was exercised.

## Visitor PASS

Tested with the real browser against `http://127.0.0.1:5000` at 375px and
1440px, anonymously, without catalog writes:

- Home → Encoding & Codecs → Codecs → Cisco OpenH264 resource detail.
- Mobile taxonomy drawer and mobile header search.
- First category-card More tags expand and collapse.
- Guest Suggest Edit prompt and guest Favorite prompt on detail and listing
  cards; prompts were dismissed without signing in.
- Header search `ffmpeg`; selected the canonical FFmpeg result
  (`/resource/185214`).
- FFmpeg tag `#multimedia framework`; verified the tag route and its two
  matching resources.
- Category sort (`Name A-Z`), tag Filters (`Open Source`), filtered page 2,
  and unfiltered page-jump input `2` on the 14-page listing.
- About → Terms → visitor account menu → Sign in view. No credentials,
  submission, sign-up, or external provider activation.
- Desktop More/sidebar disclosure; activated Learning Journeys.
- Desktop account menu → Escape; focus returned to `Account · Visitor`.

Named exclusions: bookmarks, shares, external-resource activation, submit/edit
submission, approve/reject/delete, jobs/exports, every More disclosure link,
authentication submission/provider behavior, and exhaustive button/link/row
census. Direct page-2 link was used for the filtered two-page result; the
page-jump input was used for the unfiltered 14-page result.

## Admin UNABLE

No admin dashboard action was executed. Exact disposable identity provisioning
was blocked before browser authentication:

- Native Clerk API setup returned `401` (`Clerk provisioning failed 401`).
- The failure occurred before a user was created, before session injection, and
  before local JIT/admin promotion.
- The notebook could not access shell process-only Clerk secrets. No secret,
  identity value, Clerk ID, cookie, storage state, or auth state was copied
  here.
- The permitted helper setup was attempted in `/tmp`, but the detached shell
  process was terminated before completion. Its completion status was never
  observed; therefore this report does **not** assume that helper setup had
  completed. The native Clerk `401` attempt itself guarantees no user was
  created.
- No sweep, existing-account impersonation, role mutation, catalog mutation,
  job, export, approval, rejection, or destructive admin action was run.

The requested 18-panel admin verification, read-only admin filters/search/sort/
pagination, safe form open/cancel, Researcher Job History, 375/1440 admin
captures, and exact teardown proof remain unexecuted.

## Monitoring

- Direct port 5000 visitor browser contexts: HTTP errors **0**, console/page
  errors **0**, request cancellations **0**.
- Public Replit dev-domain proxy: HTTP **502** before app UI loaded.
- Admin setup: Clerk API **401** before identity creation/authentication.
- Normal Vite/React startup logs and Clerk development-key warning were
  observed; no direct-port application failure was found.

## Browser evidence

Screenshot export from the native browser notebook is not supported in this
environment. The following retained artifact IDs are the available evidence;
there are no PNG/JPEG file exports in this directory:

- Visitor mobile: `ctvfj2`, `n7j1qi`, `7ohr38`, `stgfr3`, `cuiwn1`,
  `vp6gf9`, `722u7g`, `hiefpt`
- Visitor desktop: `4n4lbi`, `4qz8c2`, `e59xhp`, `at09q7`, `m7m8oy`,
  `1zfvvo`, `l96i9g`
- Setup/blocker: `9qsn4s`, `uu2yuh`

No secret/identity/auth-state copies are included. Existing visitor evidence
files elsewhere under `docs/parity/evidence/clickthrough/production/` were not
copied or rewritten because browser capture export is unavailable and source
changes are out of scope.

## Cleanup status

No helper process was running at final inspection, and no setup completion
artifacts or teardown result were present. The failed native `401` request
created no identity. The earlier helper attempt is explicitly **uncertain
before completion**, not reported as a verified zero-account result.