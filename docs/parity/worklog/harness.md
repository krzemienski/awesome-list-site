# Worklog — harness (harden the parity harness)

Task: make `tests/parity/runner.mjs` a trustworthy instrument before any page
task measures against it. Scope: `tests/parity/**`, `docs/parity/REPORT.md`,
`docs/parity/STATUS.md`, this worklog, `docs/parity/assumptions/harness.md`,
`docs/parity/evidence/harness/`. Out of scope: making rows pass, app CSS or
components (`client/`, `server/`, `shared/` untouched), the design source
(`awesome-list-site-ds/` untouched).

## 1. Failure list (written before any code changed)

Observed on `main` at the start of the task, from reading the runner
(1306 lines), `inventory.json`, `tests/parity/README.md`,
`docs/parity/STATUS.md`, the last baseline run and the design source.

### CLI

| # | Failure | Evidence |
|---|---|---|
| F1 | `--list` prints `pixel-gated` for everything that is a `screens[]` entry — blocked rows (`app.search`, `app.submit`, `app.admin.overview`, `app.settings.theme`, `app.not-found`), the alias `app.shell.default`, the 22 `artifact.docs.*` rows and the 13 `app.admin.<tab>` rows included. Only `tokenOnly` prints `token-only`; the `unconfiguredScreens` triples print their raw classification. No reason text, no eligibility class. | `node tests/parity/runner.mjs --list` → tab-separated `id  classification  kind` |
| F2 | `--list` does run without a server today (exit 0, no env), but only because the `BASE_URL`/`ARTIFACT_BASE_URL` checks come after the early `process.exit(0)`; nothing guarantees that ordering. | runner lines 117–137 |
| F3 | No `--only <id>[,<id>]`; only a single `--screen`. No comma-separated `--width`. No `--as`, `--keep-user`, `--sweep`. | `argValue` parsing, lines 100–112 |
| F4 | Exit code: `process.exitCode = 1` whenever `gatePassed` is false, and a filtered run can never pass the gate, so `--screen X` exits 1 even when every executed row passes. There is no distinct code for harness/precondition failures. | line 1306; `gatePassed` requires `!filteredRun` |
| F5 | A filtered run still emits every non-selected row as `FILTERED`, so `results.json` cannot be read as “these rows were measured” without filtering by status. | rows loop lines 432–501 |

### Inventory

| # | Failure | Evidence |
|---|---|---|
| F6 | One monolithic `inventory.json` (schemaVersion 1) with the validation rules inlined in the runner (`assert(...)` calls). A page task adding a screen has to edit the shared file and cannot validate its entry without running the harness. No JSON schema exists. | runner lines 20–99 |
| F7 | Admin coverage is one blocked `app.admin.overview` row plus a bare `adminSections` string list of 13 tabs. The design has 15 tabs (`overview … audit, research`), the app has 17 (`+ subsubcategories, journeys, digests`). There is no per-tab row with a reference action. | `awesome-list-site-ds/admin.jsx` `ADMIN_TABS`; `client/src/pages/AdminDashboard.tsx` `tab-<slug>` test ids |
| F8 | No `app.home.curated` row although the design ships a Curated home layout behind the tweaks panel, and no sub-subcategory row although both sides route to one (`/sub-subcategory/:slug`; `__avGo('subcategory', {cat, sub, subSub})`). | `app.jsx` lines 105, 199–206; `App.tsx` line 676 |
| F9 | Reference actions exist only for home-index, palette, mobile-drawer and the `__avGo` page kinds; palette-open and drawer-open are keyed on a `side` string with hard-coded selectors instead of inventory-declared ready selectors. | `applyAction`, lines 691–749 |

### Determinism

| # | Failure | Evidence |
|---|---|---|
| F10 | Two 375 px reference captures of the home index differed by 68 pixels inside x=41–333, y=119–490 at identical 375×5453 dimensions. The cause was never found; the previous run recorded it as a blocker. | `docs/parity/STATUS.md` blocker 3 |
| F11 | The settle routine waits for `document.fonts.ready` and images, but never for the reference app to be booted (`window.__avGo`), and the two-rAF wait happens only inside the scroll warm-up, not before the capture. Per-page settling is duplicated with no shared readiness contract. | `settlePage`, lines 519–689 |
| F12 | The reference is captured after the app page (actual first), so the app page keeps running (timers, refetches) while the reference loads; no clock control on either side. `time ago` labels, `WEEK 37`, and anything derived from `Date.now()` are free to drift between the two captures and between runs. | rows loop, lines 975–1002 |

### Fonts

| # | Failure | Evidence |
|---|---|---|
| F13 | There is no font-face parity assertion. Each page checks only its own `--font-body/--font-display/--font-mono` faces plus faces used by visible nodes; the two pages are never compared. The design loads nine families from Google Fonts up front (`index.html`), the app loads three eagerly (Fraunces incl. italic 400, JetBrains Mono, Inter) and the rest on demand, so a page can be captured with a synthesized or fallback face and nothing says which side is missing what. | runner lines 523–607; `client/index.html` lines 270–287; `awesome-list-site-ds/index.html` |

### Identity and data

| # | Failure | Evidence |
|---|---|---|
| F14 | The reference header renders a hard-coded signed-in admin (`Account · Admin`, avatar `N`, name `Nick`) while the app is captured as a visitor (`Sign in`). Every app row therefore carries a header diff before any page work starts; the last run marked it as a visual defect on every row. | `layout.jsx` header; `results.json` `authAlignment` |
| F15 | Admin rows are blocked because the reference admin globals (`AV_TOTAL_USERS`, `AV_USERS`, `AV_RECENT_ACTIVITY`, `AV_RESEARCH_JOBS`, `AV_ENRICHMENT_JOBS`, `AV_SYNC_JOBS`) and literals (`Pending approvals 7`, `oldest 14m ago`, `2 admins · 1 contributor`, `across 9 categories`) are demo data. The public-catalog adapter binds `AV_CATEGORIES`, `AV_SUBCATEGORIES`, `AV_SUBSUBCATEGORIES`, `AV_RESOURCES`, `AV_TOTAL`, `AV_TOTAL_SUBCATS` only. | `data.js` lines 215–262; `admin.jsx` lines 60, 114–118; runner lines 193–242 |
| F16 | Home literals `+12 this week`, `WEEK 37`, `CONTRIBUTORS 3 reviewing`, `UPDATED TODAY` are static in the design and are compared against live app values, so the resulting diff is neither the page task's fault nor measurable separately. | `home-layouts.jsx` lines 105–109, 185–192 |
| F17 | No disposable-identity flow exists anywhere in `tests/parity/`; the only proven Clerk sign-in code lives in `scripts/validation/ds-button-sweep.mjs` and is not reusable from the runner. | grep `clerk` in `tests/parity/` → 0 hits |

### Results and report

| # | Failure | Evidence |
|---|---|---|
| F18 | `REPORT.md` has five hard-coded “Actionable implementation findings” bullets that describe the first run and are re-emitted verbatim by every run regardless of the data. | runner lines 1238–1244 |
| F19 | `docs/parity/REPORT.md` is only written as a side effect of a full run; it cannot be regenerated from an existing `results.json`, and it has no eligibility list or explicit denominator table. | runner lines 1288–1290 |
| F20 | The README documents `--screen` and `--width` only, does not say how a page task adds a screen, and does not state that the comparison target is the local app on port 5000 (production comparison lives in `production-baseline-compare.mjs`). | `tests/parity/README.md` |

### Gates at start

| gate | result |
|---|---|
| `npm run check` | green (unchanged by this task; no TypeScript touched) |
| `npm run lint` | **pre-existing red: 5577 problems (5554 errors, 23 warnings) across 467 files.** 245 are “File … not found by the project service” parsing errors on `.mjs`/skill/cache/dist files outside the typed-lint project (49 under `scripts/validation`, the rest under `.local/`, `.agents/`, `scripts/archive`, `artifacts/*/dist`, `tests/e2e`); the remaining 5332 are typed rules in `client/`/`server/` (`no-unsafe-member-access` 1416, `no-unsafe-assignment` 839, `no-explicit-any` 685, `prefer-nullish-coalescing` 660, …). The per-file comparison in §5 uses a snapshot of the task's base commit (6af6a6fc) linted from a detached worktree (5550 problems: the same 5425 typed-rule findings, plus 125 project-service parse errors — the worktree lacks the untracked `.local/`, `.cache/`, `.agents/` and `dist/` files that carry the other 120); project-service parse errors are compared separately from rule findings because they are a configuration blind spot, not a rule result. Because the project ESLint cannot parse `.mjs` at all, the harness modules are additionally linted with `@eslint/js` recommended + `no-unused-vars` through a throw-away flat config (`npx eslint --no-config-lookup --config <flat-config> tests/parity/*.mjs`, the config being `@eslint/js` recommended with node + browser globals, `no-unused-vars` and `no-empty` with `allowEmptyCatch`), which is the only real lint signal those files get. |
| `npm run test:unit` | green |
| `root-script-drift` | green |
| `node tests/parity/runner.mjs --list` | exit 0 without env (see F1/F2) |

## 2. What changed

The runner was rebuilt as five modules under `tests/parity/` — `cli.mjs`
(argument contract), `inventory.mjs` (+ `inventory/*.json` fragments and
`inventory.schema.json`), `readiness.mjs` (settle contract, font-face
collection, capture stability), `actions.mjs` (per-row actions on both sides),
`reference-adapter.mjs` (catalog/admin binding and placeholder substitutions),
`identity.mjs` (disposable Clerk admin) and `report.mjs` (markdown), with
`runner.mjs` as the orchestrator. Against the failure list:

| F# | Resolution |
|---|---|
| F1–F5 | `--list` prints `pixel` / `token-only` / `artifact-docs` / `blocked:<reason>` per row and needs no server; `--only`, comma `--width`, `--as visitor`, `--keep-user`, `--sweep`, `--determinism n`, `--report <results.json>`, `--help`; unknown options exit 2 with usage. Exit 0 when every executed pixel row passes (full admin runs also need the gate), 1 on any FAIL/BLOCKED pixel row, 2 on precondition/CLI/infrastructure failure or incomplete identity teardown. Non-selected rows are not emitted; filtered runs are labelled `selected-rows-diagnostic`. |
| F6–F9 | Inventory fragments per family with a zod schema (`inventory.schema.json` regenerated by `node tests/parity/inventory.mjs --write`; a stale merge refuses to start). Every configured app row has a reference action: `home-index` / `home-curated` (tweaks panel), `mobile-drawer`, `palette`, `category` / `subcategory` / `subsubcategory` / `resource` / `about` / `submit` / `admin` via `__avGo`, and `admin-tab:<slug>` for all 15 design tabs (the app's `tab-<slug>` test ids). A reference action that cannot resolve its entity in the adapter-bound catalog now fails loudly instead of crashing the design's React tree. |
| F10–F12 | Root cause of the 68-pixel drift: headless Chromium rasterises `backdrop-filter: blur()` non-deterministically. Neutralised symmetrically (see assumptions §4) with the pre-normalisation set compared per row. Shared settle contract (`readiness.mjs`): reference boot (`__avGo`), fonts, images, two frames, DOM quiet, then two consecutive byte-identical full-page frames (≤ 8 attempts). Frozen clock on both contexts (`clock.setFixedTime`, assumptions §2). Determinism proof: `--determinism 3` on `app.about`, `app.category`, `app.home.index` at 375 and 768 → 6/6 cells byte-identical across three fresh browser contexts (18 captures), evidence in `docs/parity/evidence/harness/determinism/`; the report quotes it whenever a run carries no determinism cells of its own. |
| F13 | Nine families forced to load on both pages before capture; declared `@font-face` sets diffed per family/style/weight; any gap fails the row and is written to `font-gaps.md`. |
| F14–F17 | Disposable Clerk admin "Nick" (assumptions §1): backend-API create → real `/sign-in` UI → JIT provisioning → audit-key promote → `/api/admin/*` read through the same session → local + Clerk delete + verification. Admin tab rows now capture as admin on both sides. Design placeholder literals are substituted on the served bytes from real data (assumptions §3), each substitution recorded with its source. |
| F18–F20 | Report is data-driven (`--report` re-renders any `results.json`), with denominator table, eligibility list, identity/teardown line, capture configuration, substitutions, font gaps and per-row table. README rewritten (prerequisites, commands, exit codes, identity, capture rules, union-canvas and no-masking rules, adding a fragment, local-app-only). |

Additional hardening found necessary while running it:

- Admin user routes validate `:id` as a bounded integer string, so the bridge id
  is numeric (2 000 000 000+) and the `__qa_test_parity_` prefix lives on the
  email; the first attempt with a prefixed id left a row that only direct SQL
  could remove (deleted; users before/after proof below).
- Admin reads go through a same-origin credentialed `fetch` from the signed-in
  page rather than Playwright's request context (the latter received 401s).
- Failure diagnostics: a side that cannot be opened or settled writes
  `diagnostics/<row>-<width>-<side>.{png,json}` (URL, title, console errors,
  page errors, failed requests) into the run and the row links to it.
- Pre-seeded `analytics-consent = denied` on the app side so the consent prompt
  the design does not have never sits over the capture (user state, recorded in
  `configuration.captureState`, not masking).

The first full run (killed at 99/123 cells) exposed three more defects, all
fixed before the run that produced the committed baseline:

- **Reference readiness waited for `window.__avGo` on every design page.** The
  design's `docs.html` and `design-system.html` are static and never define it,
  so every `artifact.docs.*`, `artifact.anatomy.flows` and `artifact.showcase`
  expected side timed out after 60 s. The wait now applies only to the design's
  SPA entry (`/`, `/index.html`).
- **Side-string mismatch.** The runner labelled the app side `"app"` while the
  actions module branched on `"actual"`, so the app side ran the *reference*
  selectors: the palette action looked for the design's `.modal-backdrop` and
  the drawer action clicked "Open menu" instead of "Toggle sidebar" — four
  palette cells and the 375 drawer cell failed as "capture failed" instead of
  being compared. `applyAction` now rejects anything but `"actual"` /
  `"reference"`.
- **The app rate-limited itself during the run.** The signed-in home issues two
  `POST /api/recommendations` per load and that route sits behind the AI
  limiter (10 per 15 min per IP; `rate_limit_hits` showed 26 hits from
  127.0.0.1). Late home/palette/drawer cells were captured while the panel
  showed an error, and the previous settle logic could not tell. Rather than
  intercept or stub the call (forbidden: it would capture a state the app never
  shows a user), the harness now (1) tracks same-origin `/api/` traffic per
  page, (2) waits for API idle before a frame counts, (3) fails the side on any
  `429`/`5xx` (`apiFailures` on the row), (4) reads the standard `RateLimit-*`
  headers, remembers which rows consume each limiter and the per-load cost, and
  defers a consumer cell behind the remaining cells while the window is closed
  (sleeping only when nothing else is left) — or, when a `429` still arrives
  because an earlier run filled the window, waits once and reopens the side.
  Deferrals and waits are recorded in `configuration.throttleDeferrals` /
  `configuration.throttleWaits`; waits are excluded from the row budget. Verified live: a run started with the window
  full received a real 429, logged "waiting 208s … reopening once", and the
  reopened side captured the same 1272620-pixel diff as the unthrottled run.
  Side finding for the page wave: the two POSTs per load double the AI budget
  cost of every home visit, and the dev Postgres rate-limit store fell back to
  in-memory limiting once during these runs (`[rate-limit] Postgres store
  unavailable (query timeout)`), which is when the limiter appears to skip.

The second full run (killed after the first eight failures repeated) exposed two
more, both in the capture path:

- **Full-page frames never agreed on some design pages.** `about` at 768/1024/
  1440 and five admin tabs failed "no two consecutive raw full-page captures
  stabilized within 8 attempts", always on the reference side, the hashes
  alternating A/B/A/B. A probe script showed 2–6 pixels flipping per frame:
  ±1 grey level on card corners and the anti-aliased edge of the footer "av"
  tile, with every bounding rect unchanged. Bisecting the normalisation CSS was
  a red herring (each property alone looked stable by luck — the flip is
  timing-dependent). Root cause: Chromium's partial raster reuses tile content
  across the re-raster that `captureBeyondViewport` triggers on every
  full-page shot. Launching Chromium with `--disable-partial-raster` made
  18/18 frames across three fresh browsers byte-identical; the flag is applied
  to both sides and recorded as `configuration.chromiumArgs`. Growing the
  viewport to the document and taking a viewport shot was tried first and
  rejected: it resizes the layout viewport, so every viewport-relative box
  (`100vh`, `100dvh`, `vw` units) grows with the document and the capture no
  longer shows what a user at that width sees; a full-page shot keeps the
  layout viewport at the configured size.
- **The app side could be captured before React mounted.** og-middleware ships
  crawler prerender inside `#root` and `main.tsx` parks it in a fixed
  `#ssr-seo-hold` overlay until data arrives; both satisfy plain ready
  selectors such as `main h1`. The very first app row after a cold Vite compile
  (`about` @ 375) was captured as the 4 158-pixel prerender and diffed as "the
  app" (56 % instead of the real 75 %). The settle contract now requires
  React's container on `#root` and the absence of `#ssr-seo-content` /
  `#ssr-seo-hold` before any selector is trusted (README "Capture rules").

The third full run (10:44 UTC, 66 min, exit 1 as expected: 0/93 pixel rows
pass) ran to completion with every defect above fixed — 0 stability failures,
0 API failures, one 570 s rate-limit wait and eight deferrals — but a spot check
of the captures found one more, again in the capture path:

- **A workspace write during the run reloaded the app page between the settle
  check and the frames.** `about` @ 768 was captured as the 768 × 2 634 px
  crawler prerender behind `#ssr-seo-hold` instead of the 4 597 px React page,
  and both stability frames agreed because the overlay is static. The app log
  showed `[vite] page reload …` for `docs/parity/worklog/harness.md` and for
  the deletion of a superseded run directory — my own edits, written while the
  run was in progress — at the second the cell was captured. `vite.config.ts`
  only excludes `.local`, `.cache`, `.config`, `.git`, `node_modules`, `dist`,
  `_planning`, `attached_assets`, `.agents` and logs from the watcher, so a
  markdown edit, a `touch`, or a directory delete anywhere else in the
  workspace reloads every open app page; the settle contract had checked for
  the overlay once, before the frames. Fix: `settlePage` stamps the settled
  document (`window.__parityDocument`, a random token) and every frame is
  bracketed — before and after — by a check that the stamp is still there, no
  hold overlay exists and React's container is on `#root`. A side that fails
  the check, or whose execution context is destroyed while settling, is
  reopened from scratch (fresh context, same action, full settle) at most
  twice per side and row; discarded frames are moved to
  `diagnostics/<row>-<width>-<side>-reload-<n>.attempt-N.png`, the event is
  recorded in `configuration.documentReloads` and the row carries
  `reopenedAfterReload`. Verified live twice: a probe that reloaded the page
  after settle was refused before frame 1 and one that reloaded mid-capture was
  refused before frame 2; then a diagnostic run of `about` @ 768 with a
  `touch docs/parity/worklog/harness.md` injected six seconds into the cell
  logged "document reloaded before frame 1 (settle stamp gone …); reopening the
  side (1/2)" and produced a 4 597 px capture whose SHA-256 is byte-identical
  to the clean runs of the same cell (evidence:
  `docs/parity/evidence/harness/reload-recovery/`). Operating rule, now in the
  README: do not write files anywhere in the workspace while a run is in
  progress — the runner itself stages under `/tmp/parity-baseline/<run>` and
  copies into the repo only after the last capture.
- Two smaller report fixes from the same review: a selected (`--only`) run no
  longer overwrites the shared `docs/parity/REPORT.md` / `tests/parity/REPORT.md`
  (it still writes its own), and the report now quotes the standalone
  determinism evidence and lists the run's recoveries (rate-limit waits,
  deferrals, document reloads) so a reader can judge the run without opening
  `results.json`. The root `tests/parity/{actual,expected,diff}` mirrors and the
  commit no longer carry the raw stability frames (hashes stay in
  `results.json` / `OUTPUT-MANIFEST.json`).

The fourth full run (12:27 UTC, 67 min, exit 1: 0/93 pass) reproduced every
measured row of the third within a few data-driven pixels (273 of 293 rows
identical, `about` @ 768 now the full 4 597 px page) and confirmed
`documentReloads: []`, but one pixel row was still a capture failure rather
than a measurement — the same row in both runs:

- **A session snapshot taken before a rate-limit wait arrives expired.**
  `openSide` took `identity.storageState()` (which refreshes the Clerk token
  and copies the cookie jar) and *then* waited 569 s for the AI limiter window
  before `app.shell.palette` @ 768. The capture context runs under the frozen
  clock, so ClerkJS never refreshes the ~60 s session token it was handed; the
  app answered `/api/auth/user` as signed out and the row failed with "session
  lapsed before capture" (diagnostics showed the visitor header with "Sign in").
  Rows that were merely *deferred* were unaffected because the snapshot is
  taken inside `openSide`, after the deferral. Fix: wait first, snapshot last —
  the same order the 429-retry path already used, which is why the live
  208 s-wait test had passed. The wait/failure timeline of both runs is kept in
  `docs/parity/evidence/harness/session-refresh/`.
- `docs/parity/evidence/harness/sample-diffs/` copied the three sides of a row
  onto the same basename, so only the diff survived; the copies are now
  suffixed `.actual/.expected/.diff.png`.

The fifth full run (13:38 UTC) measured `app.shell.palette` @ 768 (28.49 %)
but lost @ 1024 and @ 1440 to "exceeded the 150s row budget" although each had
just recorded a 660 s / 510 s limiter wait that the budget is meant to exclude:

- **The row budget's baseline was taken after the row started.** `withTimeout`
  received the already-running `captureRow(...)` promise and only then summed
  the recorded waits as its "before" baseline. With the wait now the row's first
  act, `awaitThrottleBudget` pushes the wait entry synchronously — no `await`
  precedes it — so the push landed *inside* the baseline and the wait counted
  against the row. The earlier order had hidden this because
  `identity.storageState()` yielded before the push. `withTimeout` now takes a
  thunk and snapshots the baseline before starting the row
  (`budget-before-fix.{json,txt}` in `docs/parity/evidence/harness/session-refresh/`).
  The wait path was then rehearsed in isolation (14:46 UTC):
  `--only app.home.index,app.shell.palette` — eight consumer loads, sixteen hits
  against a ten-hit window — forced a deferral-free in-row wait of 475 s that
  was followed by a measured `app.shell.palette` @ 768 (28.32 %), no budget
  timeout and no session lapse (`wait-path-rehearsal.{txt,json}` in the same
  evidence directory).

The sixth full run (15:04 UTC) was killed after 56 minutes — 185 of 293 rows
in, no failures — by a workspace restart that also wiped `/tmp` (the runner's
staging area, the drafts and the gate snapshots kept there) and left the run's
disposable admin behind. `--sweep` removed it (1 local + 1 Clerk user, 0
remaining) before the seventh run, which is the committed baseline (§5). The
`session-refresh/` evidence files were among the losses; they were rebuilt
from the runner output quoted in this worklog and are labelled as
reconstructed excerpts (the numbers are copied, not re-measured). Lesson
recorded in the README: keep anything a run must survive inside the workspace,
under a watcher-excluded directory such as `.cache/`, not in `/tmp`.

## 3. Alternatives rejected

- **Masking dynamic regions** (relative times, counts, header account chip):
  forbidden by the brief and would hide real defects. Replaced by making both
  sides show the same data (adapter + frozen clock + real identity).
- **Prefixed string bridge id** for the disposable admin: provisioned fine but
  the admin `:id` contract guard (int4 string) rejected rename/promote/delete.
- **`clock.install()` virtual timers**: pauses timers, stalling Clerk's
  handshake and the app's own polling; `setFixedTime` freezes only `Date`.
- **Playwright request context for admin reads**: shares the cookie jar but the
  app answered 401; the page's own `fetch` is also closer to what the app does.
- **A shared visitor snapshot instead of a Clerk user**: would still capture the
  app signed-out and leave the header diff on every row (F14).
- **Dropping the backdrop-filter audit** after neutralising the blur: would let a
  page ship without the blur; the per-row set comparison keeps that visible.
- **Routing or fulfilling `/api/recommendations` from the harness** to dodge
  the AI limiter: a mocked response is a state the app never shows a user, so
  the capture would prove nothing. Waiting for the real window is slower but
  honest.
- **Viewport-fit capture instead of `fullPage`** to dodge the raster jitter:
  pixel-identical on the design, but it resizes the layout viewport so every
  `100vh` box on the app grows with the document. `--disable-partial-raster`
  keeps the full-page semantics.
- **Tolerating a few jittering pixels between stability frames**: would have
  hidden the raster defect and weakened the loading-state rejection; the
  criterion stays byte-identical.

## 4. Known gaps (page-wave findings, not harness defects)

- The app declares only Inter, Fraunces and JetBrains Mono; the design declares
  all nine families. Every app row therefore fails font parity until the font
  wave lands; the gap table names the missing faces per row.
- App pages emit `backdrop-filter` `blur(14px)` only; the design also uses
  `blur(2px)` (grain layer) on every page, so the set comparison flags every row.
- Rows behind `blocked:` reasons (search, sign-in/up, settings theme, not-found,
  design-only states) still have no counterpart and stay outside the denominator.
- Frozen `Date` stops ClerkJS token refresh; a row must settle within roughly a
  minute of opening (assumptions §2).
- The design admin **Resources** tab renders the entire catalog (no paging), so
  the reference side of `app.admin.resources` is ≈125 000 px tall at 375 and the
  row diffs at ≈98 % on every width (46 M differing pixels at 375). The page
  wave has to decide between paging the design tab and paging the app tab the
  same way; the harness measures it as-is.
- At 375 the design admin **Overview** tab lays out at 400 px (its stat grid
  does not shrink below its minimum column widths), so `app.admin.overview`
  @ 375 is compared on a 400-px-wide union canvas with a 25-px unmatched strip;
  the other admin tabs stay at 375 on both sides.
- The design-system artifact's docs pages overflow the 375 viewport on **both**
  sides (artifact documents 607–925 px wide, design docs 389–920 px; the
  `integration` page is 920–1180 px wide up to 1024), so the `artifact.docs.*`
  evidence rows compare on canvases wider than the viewport until the docs
  wave fixes the horizontal overflow.
- `app.home.curated` is BLOCKED at runtime on all four widths: the app exposes
  no curated-home layout control (`[data-testid=home-layout-curated]` or a
  control named /curated/i), while the design demonstrates one. It counts
  against the exit code, as every runtime block of a pixel row does.
- The disposable admin "Nick" is a real user, so it appears in the app's Users
  tab and in the audit log (its own promotion), which the design's fixture data
  does not show; `app.admin.users` and `app.admin.audit` carry that one-row
  difference until the page wave seeds the design fixtures from the same data
  or the adapter learns to hide the harness identity.
- Home rows (`app.home.index`, `app.shell.palette`, `app.shell.mobile-drawer`)
  embed live AI recommendations that the app generates per user; their text
  differs between runs, so those rows move by up to about one percentage point
  from run to run while every other row reproduces to the pixel. The design
  side shows fixed demonstrator copy, so this is a page-wave data decision, not
  a capture defect (masking is forbidden by the brief).

## 5. Final baseline run and gates at end

The committed baseline is the seventh full run, `tests/parity/baseline/2026-09-12T16-03-20-100Z-278`
(started 2026-09-12T16:03:20.100Z, finished 2026-09-12T17:09:33.306Z, exit 1, claim
`pre-parity-baseline`):

- 93 pixel rows in the denominator: **0 pass, 93 fail** — every
  failing row is a real measurement (0 capture failures); 0 fail on the font gap alone.
  Differing pixels range from 5.74 % to 98.77 % (median 37.24 %).
- 52 BLOCKED rows (48 by inventory eligibility, 4 `app.home.curated` at runtime),
  88 EVIDENCE rows (artifact docs), 56 UNVERIFIED token-only rows,
  4 ALIAS rows — 293 rows in total.
- Recoveries: 1 rate-limit wait(s) totalling 569 s, 8 deferrals,
  0 document reloads; `inputsChangedDuringRun` = false.
- Identity: disposable admin `2061939781` ("Nick") created, promoted, torn down
  (local true, Clerk true, leftovers []);
  the `users` table held the same seven rows and zero `__qa_test_%` rows before and after
  (`select count(*), count(*) filter (where email like '__qa_test_%') from users` →
  `{"total":7,"qa":0}` at 16:02 UTC and again at 17:13 UTC;
  `docs/parity/evidence/harness/identity-cleanup.md`).
- Frozen clock `2026-09-12T16:03:00.000Z` on both sides; Chromium 148.0.7778.96
  with `--disable-partial-raster`.

### Gates at end

| gate | result |
|---|---|
| `npm run lint` | still red, **no new rule findings in any file**: per-file diff against the base-commit snapshot → typed-rule findings 5425 → 5332 (0 files regressed, 3 generated mockup-sandbox files improved); the seven new harness modules each carry only the same single "not found by the project service" parse error that `runner.mjs` and every other plain `.mjs` in the repo already had (no new such error elsewhere in the tracked tree). |
| harness flat-config lint (`@eslint/js` recommended, node + browser globals, `no-unused-vars`, `no-empty` with `allowEmptyCatch`) over `tests/parity/*.mjs` | green |
| `npm run check` | green |
| `npm run test:unit` | green |
| `root-script-drift` | green |
| `node tests/parity/runner.mjs --list` | exit 0 without env |
| `node tests/parity/runner.mjs` (full admin run) | exit 1 — the expected pre-parity verdict above |

## 6. Post-review hardening (after the baseline run)

An independent code review of the committed harness raised four findings.
All were fixed in the harness modules **after** the seventh run, so the
baseline's recorded harness fingerprint predates these edits; none of the
changes touch capture, normalisation or comparison, and the effect on row
verdicts was measured rather than assumed (below).

| finding | fix | verification |
|---|---|---|
| `--sweep` computed "remaining" from the local `users` table only, so a failed Clerk deletion (recorded in `failed`) still exited 0. | The sweep re-lists Clerk after deleting and returns `clean` = no failure and nothing left on either side; the runner exits 2 otherwise (README exit-code section). | `--sweep` after the diagnostic run below: `clean: true`, exit 0 with an empty `failed` list; the identity teardown of that run reported local + Clerk deleted. |
| The "same entity on both sides" guard searched the whole `body` text, and the sidebar tree names every taxonomy label on every page — two sides that both fell back to a similar page could pass it. Admin rows only required *some* reference tab to be active. | Label searches are scoped to `main` with navigation removed (breadcrumb kept); category, subcategory and resource rows require the `main h1` on both sides to equal the catalogue label; the leaf row requires the app heading plus the leaf in the reference main content (the design keeps the parent heading and names the leaf in the breadcrumb); admin rows compare the active tab against the requested slug on both sides. | Live 6-row diagnostic (`--only app.category,app.subcategory,app.subsubcategory,app.resource.detail,app.admin.linkhealth,app.home.index --width 1440`, 17:29 UTC): identity `ok: true` on every kind with the headings recorded (`community & events`, `community groups`, resource title, leaf `online forums` vs reference `community groups` + breadcrumb, `tab-linkhealth` vs `link health`); five of the six rows reproduced the baseline's differing-pixel percentage to four decimals (`22.2007`, `66.5979`, `8.5370`, `36.4931`, `84.4457`), the sixth being the live-recommendation home row (29.8868 → 29.6808). Mutation probe on the app home page at 1440: `Community Groups` and `Online Forums` are present body-wide (sidebar) but absent from the scoped main content, and `Community & Events` is present in main but is not the heading — the old check accepted all three, the new one rejects them. |
| A context that failed during its own setup (`clock.setFixedTime`, init script, `newPage`, listeners) was never closed, so repeated setup failures could accumulate contexts until browser shutdown. | Both setup phases close the context on failure before rethrowing. | Code path only (no setup failure occurred in any run); the row-level close on capture failure was already in place. |
| `--determinism 3e0`, `0x3`, `+3`, `3.0` and `--width 768.0` were coerced by `Number()`; `--sweep --only …`, `--report … --width …`, `--list --keep-user` and `--determinism … --as visitor` silently ignored the extra flag. | Plain decimal integers only; a flag a mode would ignore is a `CliError`. | Fourteen parse cases run against `parseCli` (ten rejected with the new messages, four accepted). |

Two smaller consistency defects were fixed at the same time: rows that failed
to capture now carry their same-origin `apiFailures` on the row record as the
README promised (previously only in the diagnostics JSON), and
`OUTPUT-MANIFEST.json` is written last, in the published run directory, so it
really hashes `REPORT.md` and `font-gaps.md` (the diagnostic run's manifest
lists both). The diagnostic run also exposed that every run — not only full
admin runs — refreshed `docs/parity/evidence/harness/font-gaps.md`, which
would have replaced the whole-inventory table with a six-row subset; the copy
is now inside the full-run branch and the file was restored from the baseline
run. The diagnostic run directory was removed (selected runs are diagnostics,
not baselines).

## 7. Eighth full run — input-stale evidence

The next full admin run,
`tests/parity/baseline/2026-09-12T18-03-48-670Z-22711`, started at
`2026-09-12T18:03:48.670Z` and finished at `19:17:34.932Z`. It was not a
clean final baseline: the runner recorded
`provenance.workspace.inputsChangedDuringRun: true` (start fingerprint
`6500e4df…`, end fingerprint `1dfa66c1…`). It remains measured evidence only;
it must not be described as gate-passing or input-clean.

The exact hashed inputs that changed while that browser was running were:

| Hashed input | Change | Commit/time |
|---|---|---|
| `tests/parity/readiness.mjs` | Frame-level API guard and declared-face font readiness | `c429efcf`, 18:34 UTC |
| `tests/parity/report.mjs` | Live recoveries and stale-input reporting | `c429efcf`, 18:34 UTC |
| `tests/parity/runner.mjs` | Capture ordering and live API/font evidence | `c429efcf`, 18:34 UTC |
| `artifacts/awesome-video-design-system/DESIGN.md` | Reference-authority note | `8b4fbe3d` / `8964fdcd`, 18:35–36 UTC |
| `awesome-list.config.yaml` | Contact configuration | `d38861f9`, 19:05 UTC |
| `shared/contact.ts` | Contact types/configuration | `d38861f9`, 19:05 UTC |
| `shared/schema.ts` | Contact schema/provenance | `d38861f9`, 19:05 UTC |
| `client/index.html` | Canonical web-font set | `19dfa90c`, 19:09 UTC |
| `client/src/components/layout/SEOHead.tsx` | Font preload/metadata | `19dfa90c`, 19:09 UTC |
| `client/src/components/ui/theme-provider.tsx` | Font theme wiring | `19dfa90c`, 19:09 UTC |
| `client/src/lib/font-options.ts` | Font option declarations | `19dfa90c`, 19:09 UTC |
| `client/src/main.tsx` | Font loading setup | `19dfa90c`, 19:09 UTC |
| `client/src/styles/design-system.css` | Font-face/style declarations | `19dfa90c`, 19:09 UTC |

The canonical `awesome-list-site-ds/` hashes and hashed inventory JSON did
not change. `c429efcf` also edited `tests/parity/README.md` and removed old
raw baseline frames; those paths are outside the input fingerprint, but they
were still watched workspace writes. The corrected staged narrative is kept
in `.cache/parity-task/worklog-s7.md`.

## 8. Final clean full baseline and harness acceptance

The latest full admin run is
`tests/parity/baseline/2026-09-12T21-32-31-677Z-10218/results.json`
(started `2026-09-12T21:32:31.677Z`, finished `2026-09-12T22:46:23.313Z`,
exit 1, claim `pre-parity-baseline`). It is the first clean full run after
the post-review harness changes:

- Workspace fingerprints are equal (`c9781473…` at start and end) and
  `inputsChangedDuringRun: false`; `gitCommit` was
  `38831ea5bd43de6d6fb904b2bac4b5a629636870` with no dirty input paths.
- The run executed the full 293-row inventory: 93 denominator rows, 0 pass,
  93 fail, 52 blocked, 88 evidence-only, 56 token-only and 4 aliases.
  This is a clean harness run, not a parity-gate pass: the app's 89 pixel
  rows fail their measured visual/backdrop comparison, and the four
  `artifact.showcase` rows also retain their artifact font gap/synthetic
  italic defect.
- All 181 captured rows had complete font readiness on both sides, with zero
  forced-face load failures and zero unloaded faces. The 89 app pixel rows
  have no declared-face gap after the font wave. The remaining 92 rows with
  declared-face gaps are artifact evidence rows (88 excluded
  `artifact-docs`) plus the four counted `artifact.showcase` rows; they are
  reported in `font-gaps.md`, not silently ignored.
- There were no capture-failure rows, same-origin API failure rows, discarded
  frames, or document reloads. Every actual side stabilized on attempts
  `[1,2]`; 180 reference sides stabilized on `[1,2]` and one on `[2,3]`.
  The run recorded one real rate-limit wait of 554677 ms (excluded from row
  budgets) and eight queue deferrals. The standalone determinism proof
  remains 6/6 cells byte-identical across three fresh captures; see
  `docs/parity/evidence/harness/determinism/determinism.json`.
- Identity teardown was clean: disposable admin "Nick" (`2019696328`) had
  both local and Clerk rows deleted, no teardown errors, and
  `localQaUsersRemaining: []`; see
  `docs/parity/evidence/harness/identity-cleanup.md`.

### Final-run gates

| Gate | Result |
|---|---|
| Full baseline input integrity | **PASS** — equal fingerprints; `inputsChangedDuringRun: false` |
| Identity teardown | **PASS** — local and Clerk deleted; no QA users remaining |
| Capture readiness | **PASS** — no capture/API failures, no reloads, all captured sides font-complete |
| Harness module syntax | **PASS** — `node --check` over `tests/parity/*.mjs` |
| Inventory/list checks | **PASS** — 74 screens; generated inventory in sync; `--list` exit 0 |
| Pixel parity gate | **NOT PASSED** — 0/93 pixel rows pass; page-wave differences remain |

The clean run closes the harness acceptance requirement without claiming
visual parity. Task #504 is still merging; any later source change requires a
new run if it affects the runner's hashed inputs or captured surfaces.

## 9. Focused post-repair failure-path verification

The full baseline in §8 is historical. It predates the row-timeout
cancellation, `server/` fingerprint, and end-of-run live catalog/admin
adapter-hash repairs, so its equal fingerprints do **not** prove current
server or live-data integrity. No full run was repeated for this correction.

Against the live local app (`BASE_URL=http://127.0.0.1:5000`), two temporary
runner roots were used so no shared baseline, report, or capture mirror could
be overwritten:

| Probe | Result |
|---|---|
| `/tmp/parity-failure-probe-30790`, `ROW_TIMEOUT_MS=1000`, visitor `app.about,app.category@375` | Exit 2; both rows were `INCOMPLETE`, denominator 0, and the timeout terminal output for each row preceded the next row start. No capture files or lingering Chromium process remained. |
| `/tmp/parity-normal-probe-31077`, visitor `app.about@375` | Exit 0 evidence-only capture; actual/reference stability `[1,2]`, font-complete, API failures empty, catalog start/end hashes equal, workspace unchanged. |
| Same temporary root, admin `app.about@375` | Exit 1 for the expected visual diff, not infrastructure; actual/reference stability `[1,2]`, font-complete, API failures empty, catalog and admin start/end hashes equal, workspace unchanged, and local/Clerk teardown clean. |

The complete command/output and hash evidence is recorded in
`docs/parity/evidence/harness/failure-paths.md`. These selected captures
verify failure cleanup and live adapter re-reads only; they are not a new
parity baseline. The final classifier review also covers nested infrastructure
causes and common filesystem errors so an unexpected filesystem rejection
cannot be mislabeled as visual drift.

## 10. Reliability handoff review — 2026-09-13

Reused the merged implementation rather than rebuilding it. No harness runtime,
app, server, shared, artifact, frozen reference, aggregate inventory or report
files changed in this review. The artifact's `docs/` directory is empty; its
`DESIGN.md` records the reference authority and Editorial × Crimson target.

The README now explicitly lists the external React/Babel/font prerequisites,
warns against prefix-wide identity sweeping during another worker's run, and
describes fragment handoff and the separation between harness acceptance and
final integrated baseline capture.

### Retained proof personally checked

Recomputed SHA-256 from all nine PNG files in
`docs/parity/evidence/harness/determinism/`, not merely the JSON verdict:

| 375px reference row | Captures | Matching SHA-256 |
|---|---:|---|
| app.category | 3/3 | `a4c44b11eea1d30c0b758a5f97097ce848e1f4b31d97e95a8cbc4398b3212f48` |
| app.home.index | 3/3 | `f1ecd8b30067569b2d0353dacb630a49462abf49726de11e9b8daa25000833b2` |
| app.shell.mobile-drawer | 3/3 | `16166011aaacab6b3559c1067fc82ba0be7344c891765a7dafa3c7efdea5fa83` |

All hashes match `determinism.json`; its start/end fingerprints agree and both
identity deletions succeeded with no errors or local leftovers. The focused
live-local probes in `failure-paths.md` remain the timeout-cancellation,
infrastructure-exit and live-adapter evidence. Their implementation remains
unchanged. This review did not create identities or delete other workers' data.

### Current checks

- `npm run test:parity -- --list`: exit 0 while the application was stopped;
  74 screens, with eligibility and blocked reasons.
- `node scripts/validation/root-script-drift.mjs`: exit 0, 27 executable files
  checked, zero stray files.
- `npm run check`: exit 0.
- `npm run test:unit`: exit 0, 15 files and 299 tests passed.
- `npm run lint`: exit 1, 5,598 problems (5,575 errors, 23 warnings).
  The repository-wide gate remains red, including project-service parsing
  errors. This review changes only Markdown, so it introduces no linted source
  changes; it does not claim to repair the previously documented lint debt.
- `node --check` for every `tests/parity/*.mjs`: exit 0.
- Started the existing application workflow after the initial preview reported
  connection refused. Startup completed on 5000; the preview visibly rendered
  the Home heading, populated category cards, navigation and consent banner.
  This is a boot smoke check, not a visual parity claim.

No new full baseline was run or required for this implementation handoff.
Final integrated regression must still run the complete pixel gate after page
changes land, without relaxing thresholds or reclassifying failing pixel rows.

### Completion validation blocker

The completion callback rejected closure on the configured
`npm run validate:auth-return` gate. Its retained log
(`.local/state/workflow-logs/NiNdgSNtygyBrHQRpo623/validation.shell.exec.6`)
shows 27 passing checks and one password-recovery timeout waiting for
`getByText(/forgot password/i).first()` in `auth-return-audit.mjs:296`.
Sign-in/deep-return checks passed and teardown reported zero QA users.
This is outside the harness-only ownership boundary; no authentication source
or unrelated audit was changed, and the failing gate was not bypassed.

### Completion retry

The subsequent completion run (`qzT0b5xT70lIFleypu5vv`) could not execute the
configured suite reliably: migration drift, typecheck and theme-registry
checks failed to spawn processes with `EAGAIN`; auth-return and build aborted
with exit 134. This is an environment execution failure, not a harness verdict.
The same run separately reported 63 canonical-token failures in the parallel
resource-page stylesheet, outside this task's ownership. Those findings are
not waived as passing and belong to integration/final regression.

Requested completion using the retained focused harness evidence and earlier
successful task checks, with an explicit validation-skip reason for the
process-exhausted environment. No full baseline, broad sweep, unrelated source
repair, or gate-threshold change was performed.
