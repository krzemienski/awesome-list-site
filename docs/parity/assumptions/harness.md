# Assumptions — harness (harden the parity harness)

Decisions taken while making `npm run test:parity` a trustworthy gate. Page
tasks and the audit wave inherit them; a task that overturns one must say so in
its own assumptions file and add a pointer here.

## 1. Every app capture is taken as a disposable Clerk admin named "Nick"

The design demonstrator renders its shell for an admin called Nick (header
badge, admin tabs, "Nick" in the sidebar footer). A visitor capture can never
match that, so the default identity is a *real* Clerk user created through the
backend API at run start, signed in through the real `/sign-in` UI, promoted
to admin through the existing audit-key path, and deleted at the end.

- The email is `__qa_test_parity_<suffix>+clerk_test@example.com` (Clerk test
  address, OTP `424242` when the instance asks for it). The prefix is how
  `--sweep`, the admin users search (`q=` matches email) and the SQL proof find
  leftovers.
- The bridge id (`users.id` = Clerk `external_id`) is a **numeric** string in
  `2 000 000 000–2 147 483 647`, not a prefixed string. The admin user routes
  validate `:id` as a bounded int4 string, so a prefixed id could be provisioned
  by JIT sign-in but never renamed, promoted or deleted through the API (the
  first harness attempt left exactly such a row; it was removed by hand and the
  id scheme changed). Legacy subject ids are 8 digits, so the range cannot
  collide.
- Display name must resolve to exactly "Nick" (`/api/auth/user` → `user.name`);
  anything else aborts the run before any capture.
- `--as visitor` keeps the old signed-out capture as **evidence only**: rows are
  `EVIDENCE (visitor-identity)`, excluded from the denominator, and the run
  claim is `visitor-evidence-only`. Missing `CLERK_SECRET_KEY` or
  `ADMIN_PASSWORD` degrades to the same mode with `identity.reason` recorded and
  admin-session rows `BLOCKED`.
- Teardown deletes the local row through `DELETE /api/admin/users/:id`, then
  the Clerk user, then re-queries the users search for the prefix. A teardown
  error does not lose the captures: results are still written, the report says
  `INCOMPLETE — <reason>` and the exit code is forced to 2.

**Revisit when:** the admin routes accept non-numeric ids (then the bridge id
can carry the prefix too), or the app grows a first-class test-identity path.

## 2. The clock is frozen on both sides with `clock.setFixedTime`

Both the app context and the reference context get
`context.clock.setFixedTime(frozenAt)` where `frozenAt` is the run start
rounded down to the minute. `Date` is frozen; timers, `requestAnimationFrame`
and the event loop keep running, so React Query, Clerk and the design's own
`setTimeout`s still fire. `frozenAt` is recorded in `results.json`
(`configuration.frozenAt`) and passed to the reference adapter so the design's
"this week"/"WEEK nn"/"m ago" literals are computed against the same instant
the app renders relative times from.

Known consequence: with `Date` frozen, ClerkJS believes its cached 60-second
session token never ages and stops refreshing it. Mitigations, in order: every
row starts from a fresh `storageState()` whose token was just refreshed with
`Clerk.session.getToken({ skipCache: true })`; ClerkJS refetches the client on
load; the row's `/api/auth/user` check runs immediately after navigation and
turns a lapsed session into an explicit `BLOCKED`/error instead of a silent
visitor capture. An app page must therefore settle within roughly a minute of
being opened; a page that needs longer is a page defect, not a harness one.
`clock.install()` (virtual timers) was rejected because it pauses timers and
would stall Clerk's handshake and the app's polling.

**Revisit when:** a row legitimately needs more than ~60 s to settle, or Clerk
changes token lifetime.

## 3. Design placeholder literals are overridden on the served bytes only

The design source keeps hard-coded demo numbers (`+12 this week`, `CURATED ·
WEEK 37`, `across 9 categories`, `2 admins · 1 contributor`, `7 pending /
oldest 14m ago`, `CONTRIBUTORS 3 reviewing`). The adapter replaces each literal
in the **in-memory snapshot** served to the reference page with the value
derived from the app's own APIs at run start (`/api/categories` tree,
`/api/resources` `createdAt`s, `/api/admin/stats|users|pending-resources|audit-
logs` through the disposable admin's session). Files under
`awesome-list-site-ds/` are never written; every substitution is listed in
`results.json.provenance.referenceAdapter.placeholders.applied` with the source
of the value, and every literal that could not be derived (for example the
admin-only ones in a visitor run) is listed under `unadapted` and left exactly
as designed. Rule of thumb: the reference must show the same *data* as the app
so that the pixel diff measures presentation, never the demo numbers.

**Revisit when:** the design source stops shipping demo literals (then the
table should shrink to empty and the adapter can be removed).

## 4. `backdrop-filter` is neutralised symmetrically and audited separately

Headless Chromium rasterises `backdrop-filter: blur()` non-deterministically:
three fresh contexts of the same design page differed by a handful of pixels
around the header buttons. Byte-identical reference captures are a hard
requirement, so the capture normalisation sets `backdrop-filter: none` (and
disables animations, transitions and the caret) on **both** sides. That would
let a missing blur on the app slip through, so each page's set of non-`none`
computed `backdrop-filter` values is collected **before** normalisation and any
difference between app and reference is a row defect
(`backdropFilters.match === false` in the row, named in `reason`). The
normalisations are listed in `configuration.captureNormalisations`; nothing else
is masked, cropped or scaled.

**Revisit when:** a Chromium build renders the blur deterministically (drop the
neutralisation, keep the audit).

The same requirement drives one browser flag: Chromium is launched with
`--disable-partial-raster` on both sides (`configuration.chromiumArgs`).
Full-page capture re-rasters the page per frame and, with partial raster on,
reused tile content flipped single anti-aliased pixels on rounded corners
between consecutive frames of a static design page, so the byte-identical
stability check could never pass there. The flag changes how tiles are
scheduled, not what is painted; the alternative — growing the viewport to the
document and taking a viewport shot — was rejected because it changes `100vh`
layouts on the app. The stability criterion itself stays byte-identical
(tolerating "a few" pixels would hide both raster defects and loading states).

**Revisit when:** the stability check passes on the design's About page and
admin tabs without the flag.

## 5. Font-face parity is a gate, not a hint

Before every capture the nine parity families (Inter, Fraunces, JetBrains Mono,
Geist, Instrument Serif, Space Grotesk, IBM Plex Mono, IBM Plex Sans, Manrope)
are forced to load on both pages and the declared `@font-face` sets are diffed
by family/style/weight. Any gap makes the row `FAIL` regardless of its pixel
diff and the gap table is written to `font-gaps.md` and summarised in the
report. Today the app declares only the active Editorial trio, the design
declares all nine; that is a page-wave finding, not something the harness
relaxes.

## 6. The comparison target is the local app, never production

`BASE_URL` (and `ARTIFACT_BASE_URL` when an artifact row is selected) must be a
loopback origin; the runner refuses anything else and guards every page against
requests leaving the app, artifact or reference origins. Production comparison
lives in `scripts/validation/production-baseline-*.mjs` with the frozen capture
under `tests/parity/production-baseline/`.

## 7. The app's own rate limits are respected, never bypassed

The signed-in home issues two `POST /api/recommendations` per load and that
route is behind the AI limiter (10 per 15 minutes per IP). A capture taken
while the app answers `429` shows an error panel the design has no counterpart
for, so the run is only meaningful if every app response during a row was a
success.

- Same-origin `/api/` traffic is tracked per page; a frame counts only after
  the API has been idle for 750 ms (repeated until a settle round sees no new
  completion). Any `429`/`5xx` during a row fails that side with
  `app API failed during capture (…)` and the list on the row's `apiFailures`.
- The runner reads the app's standard `RateLimit-*` headers, remembers which
  rows consume each limiter and how many hits one load costs, and defers a
  consumer cell behind the remaining cells while the window is closed; it
  sleeps only when nothing else is left. A `429` that arrives anyway (a window
  filled by an earlier run) is retried once after the window resets. Deferrals
  and waits are recorded (`configuration.throttleDeferrals`,
  `configuration.throttleWaits`); waits do not count against the row budget.
- Intercepting, fulfilling or short-circuiting the recommendation call was
  rejected: the app never shows that state to a user, so nothing it captured
  would be evidence.

**Revisit when:** the home page stops issuing the recommendation call twice
per load or the limiter budget changes; the per-load cost is measured, not
configured, so the harness adapts, but a full run's wall time will change.
