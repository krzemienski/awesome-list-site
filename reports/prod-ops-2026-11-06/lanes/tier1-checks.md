# Tier 0 / 1 / 2 check ids

Layout is mine. Source: PLAN §5 (current text), `tier01-dryrun.md` (commands, values, timings), `tier2-spec.md` (steps). `B=https://awesome.video`.
`ADM` = `curl -H @"$HOME/.cache/awesome-audit/owner.hdr"` (a 401 on any ADM check reports "audit session expired", never the check's own failure).
Dry-run column = the dry-run id it came from. All 22 Tier 0/1 checks passed twice by hand on 2026-11-06.

## Tier 0 (after every publish; the 30-min schedule reports T0-01 as info only)
| ID | Assertion | Command | Dry run |
|---|---|---|---|
| T0-01 | live revision = main head | `curl -s $B/api/version \| jq -r .revision` equals `git ls-remote origin refs/heads/main \| cut -f1` | T0-a |
| T0-02 | ready probe is 200 | `curl -s -o /dev/null -w '%{http_code}' $B/api/health/ready` = 200 | T0-b |
| T0-03 | home 200 in < 5 s | `curl -s -o /dev/null -w '%{http_code} %{time_total}' $B/` | T0-c |

## Tier 1 curl half (~10 s; the 6-hourly run can use only these)
| ID | Fn | Assertion | Command | Dry run |
|---|---|---|---|---|
| T1-02 | P1 | sitemap `/resource` count = `/api/categories` resourceCount sum = `/api/admin/stats.totalPublic` (4,074 today, ±0) | count `<loc>` containing `/resource/` in `$B/sitemap.xml`; `curl $B/api/categories \| jq` sum; ADM `/api/admin/stats \| jq .totalPublic` | P1-total |
| T1-03 | P4 | sitemap total URLs ≥ 4,000 (compare to last result.json only if one exists) | `grep -o '<loc>' sitemap.xml \| wc -l` | P4-sm |
| T1-04 | P2 | 3 random sitemap resources (Googlebot UA): 200, one `<h1`, an outbound https `<a>` with `rel` containing noopener, footer/GitHub links excluded | curl each id picked at run time | P2 |
| T1-05 | P3 | `/api/search?q=ffmpeg` total > 0 | `curl -s "$B/api/search?q=ffmpeg" \| jq .total` | P3a |
| T1-07 | P4 | 4 page types (ids from sitemap/`/api/journeys`, never hard-coded; Googlebot UA): `<title[^>]*>`, description, canonical, og:image URL returns 200, every `ld+json` parses | curl each | P4 |
| T1-08 | P4 | robots 200 and body has `Sitemap:` | `curl -s $B/robots.txt` | P4-rb |
| T1-09 | P4 | bad route returns 404 (curl only, no telemetry POST) | `curl -s -o /dev/null -w '%{http_code}' $B/zz-not-a-route` | P5-404 |
| T1-14 | P7 | admin stats 200 | ADM `/api/admin/stats` | P7 |
| T1-15 | P7 | approvals readable: 200 with `resources`,`total` | ADM `/api/admin/pending-resources` | P8 |
| T1-16 | P5/P7 | ops health `ready` | ADM `/api/admin/operations/health \| jq -r .status` | P9a |
| T1-17 | P10 | newest backup < 26 h (info only until decision 2 ships); use `sort_by(.completedAt)\|last` | ADM `/api/admin/database-backups` | P9b |
| T1-18 | P9 | newest link scan `status==completed` and < 26 h | ADM `/api/admin/link-health/status \| jq .job` | P9c |
| T1-19 | P8 | newest Researcher job status ∈ {completed, cancelled, budget_stopped} and `error` empty; warn if none in 14 d | ADM `/api/researcher/jobs \| jq '.jobs[0]'` | P10 |

## Tier 1 browser half (~70 s by hand, ~30-40 s with Playwright)
| ID | Fn | Assertion | Command | Dry run |
|---|---|---|---|---|
| T1-01 | P1 | `/`, 9 categories, one sub, one sub-sub each show ≥ 1 `a[href^="/resource/"]` (home 17, cat 48, sub 48, sub-sub 20 seen), 0 console errors; could be curl on SSR HTML | open each, 2.5 s settle | P1 |
| T1-06 | P3 | ⌘K palette: open, type `ffmpeg`, ≥ 1 option (15 seen); use role selectors | Meta+k, fill, count | P3b |
| T1-10 | P6 | `/sign-in` shows the Clerk identifier input and no console error (do not rely on `cl-` classes) | open | P6a |
| T1-11 | P6 | `/profile` lands on `/sign-in?redirect_url=%2Fprofile` (client redirect; curl cannot see it) | open | P6b |
| T1-12 | P1 | 390×844: `scrollWidth <= innerWidth` on home, category, resource | eval | 390 |
| T1-13 | all | 0 console errors on every page above (filter the external OG-image 429) | errors | Con |

(Ids are grouped by what they test, not by order of execution; there is no T1-00.)

## Proposed new Tier 1 checks (browser, owner session; close the gap the C22 per-deploy rows exposed)
Tier 1 today proves admin GETs answer, not that the admin UI renders them. All read-only, 0 writes.
| ID | Assertion | C22 rows |
|---|---|---|
| NEW-1 | Admin tabs Overview, Approvals, Resources, Researcher, Database, Link Health each render with no error card; Overview feed has rows, top-five ranking matches public counts, Approvals row count = stats pending, Researcher preview not preflight-blocked, Link Health status matches `/api/admin/link-health/status` | SH-22/25/27/28/33, OV-09/15, AP-05, RS-17, LH-14 |
| NEW-2 | Resources tab: total = stats; search by title finds a known resource; status filter counts = stats; paginator moves; `?status=` / `?page=` deep links and Back/Forward restore the tab | SH-17, RM-01/06/09/11/40/43 |
| NEW-3 | Review (Approvals) and Edit (Resources) dialogs open populated and close with Cancel, nothing saved | AP-17, RM-34 |
| NEW-4 | Signed-out `/admin` shows the sign-in prompt and no admin data | SH-10 |

## Tier 2 (weekly / after a publish touching write paths; audit accounts only; spec `tier2-spec.md`)
M = audit member, A = audit admin, `<run>` = UTC stamp. Every created title starts `[QA-<run>]`.
| ID | Step | Assertion | Endpoint |
|---|---|---|---|
| T2-00 | setup | M and A sessions valid; baseline `pendingApprovals` recorded; chosen bookmark target not already bookmarked | `GET /api/admin/stats`, `GET /api/bookmarks` |
| T2-01 | 1 | M submit returns 201, `status:pending` | `POST /api/resources` (own-host URL `…/qa-probe/<run>-1`) |
| T2-02 | 2 | A queue contains id1; pendingApprovals = baseline + 1 | `GET /api/admin/pending-resources` |
| T2-03 | 3 | A reject returns 200 `rejected`; second call 409; row leaves queue; M sees reason | `POST /api/admin/resources/<id1>/reject` |
| T2-04 | 4a | M submits second row, id2 pending | `POST /api/resources` (`…-2`) |
| T2-05 | 4b | withdraw returns 200 `withdrawn`; repeat 409 | `POST /api/user/contributions/resource/<id2>/withdraw` |
| T2-06 | 5 | bookmark add 200; row in list | `POST /api/bookmarks/<rid>` |
| T2-07 | 5 | bookmark remove 200; row gone | `DELETE /api/bookmarks/<rid>` |
| T2-08 | 6 | A edits description of rejected id1 only; read-back matches; GitHub sync queue did not grow | `PUT /api/admin/resources/<id1>` |
| T2-09 | 6 | revert restores `description0` | same |
| T2-10 | 2.1 | qa-rows list shows only `[QA-` rows from audit accounts | `GET /api/admin/qa-rows` (new endpoint) |
| T2-11 | 2.2 | full JSON backup saved, SHA-256 matches | `GET …&full=1` |
| T2-12 | 2.3 | delete each id with hash + expectedTitle returns 200 | `DELETE /api/admin/qa-rows/resources/<id>` |
| T2-13 | 2.5 | public `GET /api/resources/<id>` 404; qa-rows counts 0; pendingApprovals = baseline | reads |
| T2-14 | 6b optional | M edit suggestion, A reject | `POST /api/resources/<id1>/edits`, `POST /api/admin/resource-edits/<eid>/reject` |
T2-10..T2-13 need new code (#77). T2-08 needs the sync-queue check run once first (tier2-spec §4).

## Mapping of the 44 rows (per-deploy 20 + tier2-weekly 24) — column `tier1_check` in `evidence/lead/c22-retier-rows-v2.tsv`
`A+B` = the API check proves the data, the NEW check proves the UI. No per-deploy row maps to an existing check alone.

**NEW checks the Tier 2 rows need** (proposals; none exists):
| ID | Proposed assertion | Rows |
|---|---|---|
| NEW-6 | audit admin sign-in works and a wrong password is rejected, using the audit account, not the owner (owner login shares a 10/900 s limit) | SH-05, SH-06 |
| NEW-7 | **no check**: approve makes a row public and moves counts; recommend keep Tier 2 reject-only and leave approve manual | AP-14, AP-22, RM-24 |
| NEW-8 | admin UI Create Resource with `[QA-<run>]` title appears in Resources tab, then T2-12 cleans it | RM-71 |
| NEW-9 | Create backup returns a new entry with `completedAt` ≥ now − 5 min (needs decision 2; do not run if a job is active) | EX-25 |
| NEW-10 | start link check and see status pending→completed; a publish kills it, so run alone, never with T1-18 in flight | LH-07, LH-26 |
| NEW-11 | guest bookmark merges into the audit member library after sign-in, no duplicates | C6-MB-001 |
| NONE-D16 | Researcher launch/cancel/discovery review: kept out of weekly Tier 2 by decision 16 | RS-22/31/39/41/50 |
Others: AP-11/AP-24/RM-28 → T2-03 (API only; the UI click is not exercised); RM-31/RM-37 → T2-12; RM-57 → T2-08; C6-MB-030 → T2-06+T2-07; C6-MB-048 → T2-01+T2-04; C6-MB-079 → T2-00.

## NEW-1..4 dry run (visitor4 owner session, visitor5 signed-out) — 2026-11-06 ~21:20Z
Owner session imported with `cookies set --curl owner.hdr` (nothing printed). HARs: `evidence/visitor/visitor4.har` (2,512 GET, **0 non-GET**, 0 status >= 400) and `visitor5.har` (177 GET, 0 other). Screenshots `evidence/visitor/admin-*.png`. Nothing saved, approved, rejected or signed out.

| ID | Steps | Value | Verdict | Time | Flaky? |
|---|---|---|---|---|---|
| NEW-1 | open `/admin/{overview,approvals,resources,researcher,database,link-health}`, wait 4 s, read headings/rows/`[role=alert]`, `errors` | all six render, no alert card, 0 console errors. Overview 4,074 / 99 / 23 pending ("oldest 73d") matches `/api/admin/stats`; Approvals 23 rows = `pendingApprovals` 23; Resources 25 rows, "of 4,074"; Researcher 5 job rows, run form shown; Database 6 key-table rows; Link Health shows Healthy 4,057 / Broken 1 / Suspect 16 | PASS, with one mismatch | 30 s | no (1 run, consistent) |
| NEW-1 note | Link Health tile vs `/api/admin/link-health/status` | UI Broken **1** vs API job `brokenLinks` **27** (healthy 4057 and suspect 16 match). Likely the UI counts only unresolved/non-ignored; unconfirmed | **FAIL as written** ("status matches"); either define the UI figure or compare Healthy+Suspect only | | |
| NEW-1 note | "Overview feed has rows" | feed lists 6 events as `TX#…` items, not table rows (`tbody tr` = 0); count `TX#` text instead | ambiguous selector | | |
| NEW-1 note | "Researcher preview not preflight-blocked" | not checked: needs the 5-step wizard, which I did not step through | **UNVERIFIED** | | |
| NEW-1 note | "top-five ranking matches public counts" | not checked | **UNVERIFIED** | | |
| NEW-2 | Resources: total = stats | "Showing 1 - 25 of 4,074" = totalPublic | PASS | ~5 s | no |
| NEW-2 | search `libgav1` in textbox | URL `?search=libgav1`, "1 of 1 resource", row contains libgav1 | PASS | ~4 s | no |
| NEW-2 | status deep links | `?status=pending` 23, `approved` 4,074, `rejected` 148 = stats (23 / 4,074 / 148); `?page=3` shows 51-75; `?page=999` clamps to page 163 (4,051-4,074) | PASS | 4 s each | no |
| NEW-2 | paginator moves | real ref click on `Next` (an `<a href="?page=2">`) did **not** navigate; DOM `.click()` did (26-50). Likely an agent-browser quirk (same as the palette row), not confirmed as a site bug | PASS via DOM click; **ref click FAIL**, so Playwright must be verified | ~4 s | **yes (tool-dependent)** |
| NEW-2 | Back/Forward restore | Back after Next went to `?page=163` (the previous history entry), Forward to `?page=2`; earlier, Back after search/page change went to other pages (`/admin/researcher`, `?status=rejected`). Search typing does not add a history entry | **FAIL/ambiguous**: "Back restores the tab" needs a defined expectation; today Back is browser history across deep-link opens, which is expected, so test only within one session after real clicks | ~6 s | yes |
| NEW-3 | Approvals: click `Review details for <title>` (first row), read dialog, Escape | dialog "Resource Details" populated (title, URL, description), Escape closes, stays on `/admin/approvals`. Row also has Approve and Reject buttons, **not touched** | PASS | ~4 s | no |
| NEW-3 | Resources: click `Edit <title>`, read, Escape | "Edit Resource #190924", fields edit-title/url/description populated (title libgav1), buttons Cancel and **Save Changes** present, Escape closes, nothing saved | PASS | ~4 s | no |
| NEW-3 | no request sent | visitor4.har: 0 non-GET over the whole session; GETs only | PASS | | |
| NEW-3 note | spec says "close with Cancel" | I closed with Escape only; Cancel was not clicked (not required). Spec should say Escape or Cancel | note | | |
| NEW-4 | fresh session, no cookies: open `/admin`, `/admin/resources`, `/admin/approvals` | each redirects client-side to `/sign-in?redirect_url=%2Fadmin...` ("Welcome back" form), 0 tabs, 0 rows, 0 console errors; no admin data (my regex hit the public footer "4,074 resources" on the sign-in page; "Pending approvals" / "Operations dashboard" absent). HAR has 0 `/api/admin` requests. curl without cookies: `/api/admin/stats`, `pending-resources`, `resources` all **401** | PASS | 14 s | no |
| NEW-4 note | spec says "shows the sign-in prompt" | it is a redirect to `/sign-in`, not an in-place prompt; assert the URL and absence of `[role=tab]`, not the phrase | reword | | |

### Runtime
NEW-1 ~30 s, NEW-2 ~25 s, NEW-3 ~10 s, NEW-4 ~14 s: **~80 s** by hand with fixed sleeps; ~40 s with proper waits.

### Proposed replacements
- NEW-1 Link Health: compare UI Healthy and Suspect to `job.healthyLinks`/`suspectLinks`; show Broken as info until the UI definition is known.
- NEW-2 Back/Forward: replace with "reload a deep link and the same tab and range show"; drop history assertions.
- Playwright selectors: use `getByRole('link',{name:'Next'})` and confirm it navigates, since my ref click did not.

## Lead resolution of the NEW-1 Link Health mismatch (2026-11-06)
Not a defect. Job 14's saved `brokenLinks` = 27 counts every resource checked at scan time. The dashboard's
Broken card tallies `/api/admin/link-health/broken-links` (`LinkHealthDashboard.tsx:268-273`), which lists
non-healthy checks **only for resources still approved** (`linkHealthService.ts:132-134`). Remediation archived 26 of
the 27 on Nov 6, so live = `{"broken":1,"suspect":16}` (lead GET 21:1xZ). NEW-1's assertion for Link Health must
compare the card with `broken-links` (status broken + dns_failure), never with the job's saved total.

## NEW-2 Next click, Playwright real-pointer test — 2026-11-06 ~21:30Z
One-off inline `node -e` (system Chrome via `channel:"chrome"`; bundled Chromium not installed), owner cookie from owner.hdr (not printed), `navigator.webdriver` true.
- **Result: real pointer click on the pager Next navigates**: `/admin/resources` (1-25) → `/admin/resources?page=2` (26-50 of 4,074). So the agent-browser ref click failure was a tool quirk, not a site bug. HAR `evidence/visitor/playwright-next2.har`: 99 GET, 0 other.
- **Runner selector trap**: on `/admin#resources`, `getByRole('link',{name:'Next'})` matches **2** links (strict-mode violation): a `/resource/190875` link elsewhere on the page and the pager (`/admin?page=2#resources`). Use `a[href*="page="]` filtered to text "Next" on `/admin/resources`.
- **Write caused by my first attempt (reported, not hidden)**: run 1 clicked the wrong Next (`/resource/190875`). Opening that resource page sent `POST /api/interactions` 201 at 21:15:46Z, body `{userId:<owner>, resourceId:190875, interactionType:"view"}`: one owner view-interaction row. HAR `playwright-next.har` (185 GET, 1 POST). Any check that opens a resource page while signed in writes this; the runner must not do that on the owner session.
