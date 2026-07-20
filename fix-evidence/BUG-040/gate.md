# VG-040 — Relative time says "1 minutes ago" — PASS (cannot reproduce in current code; live-verified correct)

## Finding
BUG-040 (LOW): audit reported a relative timestamp rendering as "1 minutes ago" (bad singular/plural).

## Code inspection — no custom formatter exists
Repo-wide greps (client/src + server, .ts/.tsx):
- `"minutes ago" | "hours ago" | "days ago" | "min ago" | "m ago"` → **0 hits** (no string template builds "N minutes ago")
- `timeSince | getRelativeTime | timeAgo | formatRelative | relativeTime` → only server rate-limit vars (`timeSinceLastRequest`), no formatter
- All relative-time rendering routes through **date-fns `formatDistanceToNow(..., { addSuffix: true })`** — 7 call sites, all in `client/src/pages/Profile.tsx` (Joined / Last accessed / Added / Submitted)
- Admin surfaces use absolute timestamps (`formatAdminDateTime`), not relative
- `Login.tsx:168` "about N minutes" is a lockout-duration estimate (not "ago"; N ≥ 2 by construction since it only renders when `secs > 90`)

date-fns pluralization proof (node, exact library used):
```
35s → 1 minute ago
65s → 1 minute ago
150s → 3 minutes ago
3700s → about 1 hour ago
```

## Live evidence — real records, one minute and multiple minutes
Probe: real bookmark created via `POST /api/bookmarks/187906` (admin session), aged, then Profile → Bookmarks tab rendered in Chromium at 1440px, all `* ago` lines dumped from `document.body.innerText`.

Run 1 (record age ~90s+ at read): `Added 2 minutes ago` — plural correct.
Run 2 (record age ~55s at read):
```
Joined 8 months ago
Added 1 minute ago      ← exactly-one-minute record, correct singular
Added 1 day ago         ← singular day correct
```
Submissions tab: `Submitted 2 months ago` ×4 (plural correct).
Bad-pattern scan `\b1 (minutes|hours|days|weeks|months|years) ago` across the rendered page: **0 matches**.

Screenshot: `profile-1-minute-ago.png`.

## Teardown
Probe bookmark deleted (`DELETE /api/bookmarks/187906` → 200). Net-zero.

## Verdict
**PASS** — one minute renders "1 minute ago", multiple minutes render plural, other units grammatically correct. The reported "1 minutes ago" string does not exist in the current codebase (all relative time is date-fns, which pluralizes correctly); classified fixed-prior/cannot-reproduce with live verification.
