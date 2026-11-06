# Lane: member (prod-ops 2026-11-06)

> File layout is mine (the per-feature table is LANE-RULES'; the rest is not a template).
> Read-only, **signed out** (decided by lead: no member sign-in; Clerk sign-in = POSTs to `/api/__clerk`, and lane `m6` is live on the member account).
> Prod revision at run time: `6cb1a93e` (`GET /api/version`). Run 2026-11-06 ~20:30–20:50Z. agent-browser session `member`, 1440×900 then 390×844. `navigator.webdriver` = `true`.
> Evidence: `evidence/member/` (screenshots, `signedout-api-guards.txt`, `member.har`).

## Bottom line
- No Primary function down for signed-out visitors. Every member route gates correctly (redirect to `/sign-in?redirect_url=…` or an in-page prompt) and every member API answers 401 signed out.
- Real usage of member features **cannot be learned without credentials**: no anonymous endpoint exposes bookmark/favorite/enrolment/collection counts (section 4). Closest proxy: C22 ledger shows the only member accounts are audit fixtures; analytics lane must answer real usage via admin stats.
- Member feature health is taken from the C22 re-drive (2026-11-06, real non-admin member). It is a claim from another run, not re-verified here.

## 1. Per-feature record
Result column = signed-out result **this run** (live) / last member-verified result from C22 (not re-run). "Prior" cites `reports/prod-audit-2026-10-29/cycle-22/`.

| ID | Feature | Entry | What it does | Result + evidence | Console/network errors | Write paths deferred | Essential? |
|---|---|---|---|---|---|---|---|
| M01 | Member sign-in / sign-up (Clerk) | `/sign-in`, `/sign-up`; legacy `/login`,`/register`,`/signup`,`/forgot-password` redirect | Clerk prod widget (`clerk.awesome.video`, proxied via `/api/__clerk`) | works: widget renders ("Welcome back", email, Use phone, password, Continue, Sign up) at 1440 and 390 — `evidence/member/_sign-in-1440.png`, `_sign-up-1440.png`, `m_sign-in-390.png`. Prior: sign-up→session OK, no email verification step (m0 FINDING, prod `verify_at_sign_up=false`) | none | member sign-in/sign-up submit (Clerk POSTs) — **deferred, needs owner OK** | core (gate for every member feature) |
| M02 | Route guard (`AuthGuard`) | `/profile`, `/contributions`, `/notifications`, `/onboarding`; `/account`→`/profile`; `/favorites`→`/profile?tab=favorites` | Signed out: toast "Authentication Required" + `replace` to `/sign-in?redirect_url=<path+search+hash>` | works: all 6 redirect with correct `redirect_url` (live eval, list in §2) | none | — | supporting |
| M03 | Guest bookmarks | `/bookmarks` (BookmarksGate), bookmark button on `/resource/:id` | Signed out: bookmark saved to browser `localStorage` (`guest-bookmarks-v1`), merged to account (POST /api/bookmarks per item, cap 50) on sign-in | works signed out: `/bookmarks` empty state "Nothing saved on this device … Sign in to keep your saves across devices" (`_bookmarks-1440.png`); resource page button reads "Bookmark on this device — no sign-in required" (`resource-signedout-1440.png`). Prior: guest→member merge PASS incl. 50-item cap (m0 C6-MB-001/032, 16:35–16:40Z) | none | click bookmark button (writes localStorage only, not prod, but deferred as a save control); merge-on-sign-in | core (lowest-friction member hook) |
| M04 | Member bookmarks library: notes, queue status, personal tags, bulk, archive | `/bookmarks` signed in | `GET/POST/DELETE /api/bookmarks[/:id]`, `PATCH /:id/state`, `POST /bulk`; `isAuthenticated` | UNVERIFIED live (needs sign-in). Prior PASS@1440 (rev cc0769a5, admin acct): MB-023/024/025/027/028/029/030 | n/a | all bookmark mutations | core |
| M05 | Favorites | heart on resource page; `/favorites`→`/profile?tab=favorites` | `GET/POST/DELETE /api/favorites[/:id]` | signed out: button "Favorite to your account — sign in required" (`resource-signedout-1440.png`). Prior PASS@1440 MB-008 | none | favorite toggle | supporting |
| M06 | Collections (private + public share) | `/bookmarks` collection controls; public `/collection/:shareId` | create/rename/reorder/archive/delete; publish/unpublish → public link. `GET /api/public/collections/:shareId` is the only anonymous one | signed out: unknown shareId → 404 page, API `{"message":"Collection not found"}` 404. Prior PASS MB-018/020/021/022 (publish→200, unpublish→404); MB-017/019/026 UNVERIFIED (needs ≥2 collections) | one auto 404-telemetry POST, see §5 | create/rename/reorder/archive/delete/publish | supporting |
| M07 | Journeys: browse | `/journeys`, `/journey/:id` | `GET /api/journeys`, `/api/journeys/:id` public; 5 published journeys | works: 5 journeys, each with "Start Journey" button signed out (`journey10-signedout-1440.png`) | none | — | core (content) |
| M08 | Journeys: enrol + progress | "Start Journey" on `/journeys`; step controls on `/journey/:id` | `POST /api/journeys/:id/start`, `PUT /…/progress`, `GET /…/progress` (auth) | signed out by design: list button navigates to `/journey/:id` (code `Journeys.tsx:176`, not clicked); detail page shows "Please log in to start this journey and track your progress." and read-only step list. Prior PASS MB-033/034/035; **no un-enrol control exists** (m1 ledger: journeys 10 and 6 stay enrolled) | none | Start Journey (list and detail); mark step complete/undo | supporting |
| M09 | Continue learning | `/continue-learning`, profile card | `GET /api/user/continue-learning`, `/api/user/journeys` (auth) | signed out: API 401. Prior PASS(partial) MB-036 | none | Resume | incidental |
| M10 | Recommendations | `/recommendations`; profile card | `GET /api/recommendations[/init]` **public** (popular picks); `POST /api/recommendations` (auth, `aiLimiter`, paid AI), `…/feedback` (auth) | works signed out: "Popular picks from across the catalog. Sign in to tailor them…", `GET /api/recommendations?limit=3` returns items, `/init` `{"status":"ready"}`. Prior: helpful/not-for-me/already-know/hide+undo PASS; **Refresh (paid AI run) driven once by m1** at 17:21:42Z, not undoable | none | feedback buttons; Refresh recommendations (paid) | supporting |
| M11 | Onboarding wizard | `/onboarding` (5 steps; save at step 5) | `PUT /api/user/preferences` | signed out: redirect to sign-in. Prior: steps 4–5 PASS (admin), steps 1–3 and save PASS on member (m2 C6-MB-066..070, 16:44Z) | none | Save preferences / each step PUT | supporting |
| M12 | Settings hub, theme, learning preferences | `/settings`, `/settings/theme` | `/settings` and `/settings/theme` are **public by design** (theme "saved on this device" signed out); learning prefs/home layout/notifications sections need account; `GET/PUT/DELETE /api/user/preferences` | works signed out: `/settings` renders hub (Appearance, Home layout…), `/settings/theme` renders. Prior: MB-058/059/060/061/062 PASS; **FAIL on 7e12d9c9→PASS on d8dc0b2c** (unsaved learning field reverted on Home layout click) | none | theme/layout/prefs saves (theme write also "forbidden by run rules" in C22) | supporting |
| M13 | Profile (name, progress, tabs) | `/profile` (+`?tab=favorites|bookmarks|submissions|security`) | `PATCH /api/user/profile`, `GET /api/user/progress` | signed out: redirect. Prior PASS tabs (MB-002); **MB-003 name edit FAIL (92a8662): blank name shows false "Name updated"; last name cannot be cleared**; later "restored 17:50Z" — fix status not stated in ledger | none | Save name | supporting |
| M14 | API keys | `/profile?tab=security` | `POST/GET/DELETE /api/user/api-keys`; consumption `GET /api/public/me` (Bearer) | signed out: `/api/user/api-keys` 401. Prior PASS: create, reveal-once, public API 200 with Bearer, revoke (MB-012/013/074); expired-key state UNVERIFIED | none | create / revoke key | supporting (developer-facing) |
| M15 | Account deletion | `/profile?tab=security` | `POST/DELETE /api/user/deletion-request` (request/withdraw) | signed out: not reachable. Prior PASS request+withdraw (m0 16:41Z, undone) | none | request deletion; withdraw | core (GDPR/privacy obligation) |
| M16 | Contributions: submit resource | `/submit`; `POST /api/resources`, `/api/submit` | form is **read-only signed out** ("Login required to submit … The form below is read-only") — `evidence/member/m_submit-390.png` | works (gate): matches code. Prior PASS submit→pending→withdraw (m2 MB-048/043, id 190944) | none | submit resource | core (catalog growth path) |
| M17 | Contributions: suggest edit | "Suggest Edit" on `/resource/:id` | `POST /api/resources/:id/edits` | signed out: button **present** on resource page (live DOM). Click not exercised. Prior PASS (m5, edit #142; ended SUPERSEDED, admin had to reject because member cannot withdraw a superseded edit) | none | open dialog + submit edit | supporting |
| M18 | Contributions dashboard + withdraw | `/contributions` | `GET /api/user/contributions`, withdraw route | signed out: redirect. Prior PASS filters, pagination, error state, withdraw incl. real 409 on repeat | none | Withdraw | supporting |
| M19 | Notifications inbox | `/notifications` | `GET /api/notifications`, `PATCH /:id/read`, `POST /read-all` | signed out: redirect. Prior: empty state PASS; populated inbox/Mark read **UNVERIFIED/mock only** (m5 C6-MB-051 "in-page mock only") | none | mark read / read all | incidental |
| M20 | Email digest preferences + preview | `/settings` → Notifications | `GET/PUT/PATCH /api/notification-preferences`, `GET /api/digests/preview` | signed out: all 401. Prior: preferences PASS; **SEC FAIL on 7e12d9c9 (digest opt-in accepted without verified email) → PASS on d8dc0b2c** | none | Save choices; pause; unsubscribe all | supporting |
| M21 | Digest unsubscribe link | emailed link `/unsubscribe/digest/:token` | `GET` shows confirm page, `POST` unsubscribes (`server/api/notifications.ts:175,189`) | UNVERIFIED end-to-end: C22 `m6-digest-unsubscribe.md` is **IN PROGRESS**, no email receipt recorded (digest ON since 20:16Z, poll ends ~21:46Z). Not touched here | none | the unsubscribe POST | core (legal/CAN-SPAM) |
| M22 | Sign out / Sign out all devices | profile / account menu | revokes sessions | **not touched** (LANE-RULES forbids) | — | both controls | — |

## 2. Signed-out route walkthrough (live, 1440; 390 same outcome)
| Route | Landed at | Behaviour |
|---|---|---|
| `/bookmarks` | `/bookmarks` | in-page guest empty state, no redirect |
| `/profile`, `/contributions`, `/notifications`, `/onboarding` | `/sign-in?redirect_url=<route>` | AuthGuard redirect |
| `/account` | `/sign-in?redirect_url=%2Fprofile` | → `/profile` → guard |
| `/favorites` | `/sign-in?redirect_url=%2Fprofile%3Ftab%3Dfavorites` | → profile tab → guard |
| `/settings`, `/settings/theme` | same | public (hub + device-local theme) |
| `/submit` | `/submit` | form visible, read-only banner |
| `/recommendations`, `/journeys`, `/journey/10` | same | public, sign-in prompt where member action needed |
| `/collection/doesnotexist` | same | 404 page |

390×844: `/bookmarks /profile(→sign-in) /submit /settings /journeys /sign-in /sign-up` all `innerWidth 390, scrollWidth 384` (no horizontal overflow). Console: `agent-browser console` and `errors` printed nothing for the session (no console errors captured).

Signed-out API guards (GET, `evidence/member/signedout-api-guards.txt`): 15 member GETs → **401** (`/api/bookmarks /favorites /collections /user/{profile,preferences,api-keys,progress,journeys,contributions,continue-learning} /notifications /notification-preferences /digests/preview /journeys/10/progress /recommendations/feedback`); `/api/auth/user` and `/api/auth/status` → 200 (state endpoints).

## 3. Code map (worktree `prod-ops`)
| Area | Endpoints | Guard |
|---|---|---|
| Bookmarks/favorites/collections/api-keys/profile/prefs/deletion/progress | `server/routes/domains/user-features.ts` (114–1397, 1567 lines) | `isAuthenticated` on all except `GET /api/public/collections/:shareId` (510) |
| Journeys, recommendations | `journeys-recommendations.ts`: `GET /api/journeys[/:id]` public; start/progress auth; `/api/recommendations[/init]` GET public; POST/feedback auth; `POST /api/recommendations` also `aiLimiter` | mixed, as stated |
| Submit/edit | `catalog-contributions.ts`: `POST /api/resources`, `/api/submit` (`isAuthenticated`, `submissionLimiter`); `POST /api/resources/:id/edits` (auth) | auth |
| Auth | `auth-user.ts`: `/api/auth/user`, `/status`, `logout-all` (auth), admin-login/out | — |
| Notifications/digest | `server/api/notifications.ts`: prefs 65–117, preview 122, inbox 131–166, unsubscribe 175/189 (token, no session) | auth except unsubscribe |
| Public API key use | `server/api/public.ts:453` `GET /api/public/me` (Bearer + `requireApiKey`) | key |
| Client routes | `client/src/App.tsx:866–975`; `AuthGuard.tsx` | — |

## 4. Usage signal available without credentials
Checked anonymous GETs: `/api/journeys` (fields: id,title,difficulty,stepCount,**isEnrolled,completedStepCount** — per-caller, both `false/0` anonymous, no aggregate), `/api/journeys/:id`, `/api/resources/:id` and `/api/resources?limit=1` (no bookmark/favorite/view counts in keys), `/api/public/resources`, `/api/public/collections/:id`. `/api/stats`, `/api/leaderboard`, `/api/trending`, `/api/popular`, `/api/public/stats`, `/api/collection-counts` → 404.
**Result: none.** The only aggregate in code is an internal popularity score (`UserFeatureRepository.ts:562-571`, per-resource bookmark/view/complete counts of `user_interactions`, weighted); I found no public route returning it. Real member usage (users, bookmarks, enrolments, digest subscribers) must come from the admin API in the analytics lane. Weak indirect signals: C22 `m0` notes the production Clerk instance accepted a brand-new sign-up with no verification (so signups are open); C22 test-data notes list only audit fixtures as members.

## 5. Findings / flags
1. **One non-GET request, reported per rules:** `POST https://awesome.video/api/telemetry/dead-link` → **204**. Caused by my own `open /collection/doesnotexist` (client 404 monitor, `client/src/lib/route-monitor.ts`, fire-and-forget; payload `{"path":"/collection/doesnotexist","referrer":null}`). Not a control click. It logged one server `[dead-link]` warn line. Treat as a gate exception the lead may want to note; I avoided probing other 404 URLs after it.
2. Open from C22 (not mine, still relevant): MB-003 name-edit FAIL has no recorded fix; M21 digest-unsubscribe unverified end to end; recommendations "Refresh" and journeys 6/10 enrolment and interaction row 913 are residue on the test member.
3. Direct observation: `/journeys` shows "Start Journey" buttons to signed-out visitors that navigate to the detail page rather than start anything (intended per code comment), so the label overpromises slightly. Not a defect against spec; noting for the supporting-feature view.

## 6. Deferred write paths
| Write path | Location | Status |
|---|---|---|
| Member sign-in / sign-up (Clerk POSTs to `/api/__clerk`) | `/sign-in`, `/sign-up` | write path, deferred (needs owner OK; `m6` live on member account) |
| Sign out / Sign out all devices | account menu, `/profile` | write path, deferred (forbidden) |
| Bookmark / favorite / collection create-rename-reorder-archive-delete-publish | resource page, `/bookmarks` | write path, deferred |
| Bulk status / tags / move / archive; notes | `/bookmarks` | write path, deferred |
| Start Journey; mark step complete | `/journeys`, `/journey/:id` | write path, deferred |
| Recommendation feedback; Refresh recommendations (paid AI) | `/recommendations`, `/profile` | write path, deferred |
| Onboarding save; learning prefs save/reset; home layout; theme account write | `/onboarding`, `/settings`, `/settings/theme` | write path, deferred |
| Profile name; API key create/revoke; account deletion request/withdraw | `/profile`, `?tab=security` | write path, deferred |
| Submit resource; suggest edit; withdraw contribution | `/submit`, resource page, `/contributions` | write path, deferred |
| Notification prefs save/pause/unsubscribe-all; mark read/read-all; digest unsubscribe POST | `/settings`, `/notifications`, `/unsubscribe/digest/:token` | write path, deferred |

## 7. HAR method table
`member.har` (1737 entries, whole session incl. 1440 and 390 passes), awesome.video requests:

| Method | Count |
|---|---|
| GET | 1620 (incl. Clerk JS under `/api/__clerk/npm/…`) |
| POST | 1 (`/api/telemetry/dead-link` → 204, caused by `/collection/doesnotexist` visit) |
| PUT / PATCH / DELETE | 0 |

## Lead corrections (2026-11-06)
- MB-003 (name edit) is NOT open: fixed by #278 `f345225d` "fix(profile): prefill the name editor from stored first and last name (C22-MB-003)", deployed and member-verified per docs/audit/COVERAGE.md (C6-MB-003 = FAIL→FIXED-VERIFIED). The FAIL quoted above is the pre-fix row text.
- HAR re-counted by lead: 1,590 GET + 1 POST to awesome.video (lane said 1,620 GET; the difference is entries to other hosts or counting method). The POST is `/api/telemetry/dead-link` 204, auto-fired by the client 404 monitor on visiting a non-existent URL; handler (catalog-contributions.ts:607) validates and writes one log line, no DB row.
