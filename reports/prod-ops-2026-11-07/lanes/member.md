# Lane: member (prod-ops 2026-11-07)

Revision seen at /api/version: 1cd25ab06e344b1db198857910a95486efe36082. Session po1107-member-1, state pp7b-member (read-only). /api/auth/user in page: isAuthenticated true, role user, name "[AUDIT] C22 Member", deletionRequestedAt null.
Paid-call guard: `POST /api/recommendations*` aborted by route before every signed-in page. Escaped recommendation POSTs (status 200): 0 so far (every POST in the log has no status).
Evidence: /Users/nick/Desktop/awesome-list-site/.claude/worktrees/prod-ops-1107/e2e-evidence/prod-ops-2026-11-07/member/ (sheet-<name>.png = 1280|768|390 side by side).

STATUS: DONE (member-r2, round 3; see Round 3 at the bottom for what was re-opened vs re-run)

STATUS (predecessor): COMPLETE for this pass (20:55Z). Read-only sweep of 12 member routes at 3 widths done (all sheets opened). Write cells next: journey progress, submit/withdraw, edit suggestion, API key, settings toggles.

## Function table
| function | route | nav clicks from home | 390/768/1280 result | console errors | failed network | evidence | 07b prior |
|---|---|---|---|---|---|---|---|
| Profile | /profile | 1 (account menu > Profile) | works at all 3 (sheet opened): header, stats, tabs, Learning Progress, recs panel shows "Recommendations couldn't load" because POST aborted by me; no hscroll (1280/768/390) | 0 | 0 4xx/5xx | member/sheet-profile.png | PASS (BUG-1 paid POST on load) |
| Favorites tab | /profile?tab=favorites (/favorites redirects) | 2 | works at 3; empty state "No favorites yet" | 0 | 0 | member/sheet-favorites.png | PASS |
| Bookmarks library | /bookmarks | 1 (account menu) | works at 3 (sheet opened): stats 2 active/1 saved/1 watch next, 2 cards, filters, New collection; no hscroll | 0 | 0 | member/sheet-bookmarks.png | PASS |
| Settings hub | /settings | 1 | works at 3: cards, Home layout (Index), Learning prefs empty, Notifications (email digest ON, untouched), digest preview | 0 | 0 | member/sheet-settings.png | PASS |
| Notifications | /notifications | 1 | works at 3: "All caught up" + 1 read Journey step item | 0 | 0 | member/sheet-notifications.png | PASS |
| Onboarding | /onboarding | 0 (URL; redirects to ?step=1) | works at 3: step 1 of 5, Beginner preselected; no write on load | 0 | 0 | member/sheet-onboarding.png | PASS |
| Journeys list | /journeys | 1 (nav) | works at 3: 5 journeys, 3 enrolled (Continue Journey), 2 Start Journey | 0 | 0 | member/sheet-journeys.png | PASS |
| Continue learning | /continue-learning | 1 | works at 3: 3 journeys resume, recent resources, suggested journeys | 0 | 0 | member/sheet-continue.png | PASS |
| Recommendations panel | /recommendations | 1 | with POST aborted: frame renders, panel "Recommendations couldn't load / Could not reach the server" + Try again at 3 widths (what the panel shows when POST aborted; personalised cards UNVERIFIED, paid) | 0 | POST aborted by design | member/sheet-recs.png | UNVERIFIED (paid) |
| Contributions | /contributions | 1 (Submissions tab link) | works at 3: impact tiles, timeline of withdrawn/rejected QA items and pagination | 0 | 0 | member/sheet-contrib.png (tiny; text not legible, re-open at 1280 alone before final) | PASS |
| Submit form | /submit | 1 (nav Submit) | works at 3: form enabled for member (Title, URL, Category, Tags, Description, Submit for review) | 0 | 0 | member/sheet-submit.png | PASS |
| Theme settings | /settings/theme | 1 | works at 3: Editorial active, Crimson, system font, live preview | 0 | 0 | member/sheet-theme.png | PASS |

| Journey progress (existing enrolment, journey 10) | /journey/10 | 2 (Journeys > Continue Journey) | write at 1280, 768, 390 via UI: Mark as Complete then Undo, works; baseline completedSteps [] cur 235 restored each time. Start Journey on a NEW journey stays an owner question (creates rows, no undo route) | 0 | 0 | member/journey-marked-1280.png (opened), journey-marked-768.png, journey-marked-390.png, journey-undone-1280.png | F-MACC-08 write UNVERIFIED, journey 10 mark/undo PASS at 1280 |
| Submit then withdraw | /submit, /contributions | 1 | works at 1280: POST /api/resources 201 row 190989 pending, withdrawn 200. 768/390 write: 07b passed, not repeated | 0 | 0 | member/submit-success-1280.png (sheet opened; success shot not separately opened) | PASS |
| Edit suggestion on own QA row | POST /api/resources/190989/edits | n/a (UI dialog needs a public resource page; a pending row has none) | API: 201 edit 156, withdrawn 200 via /api/user/contributions/edit/156/withdraw. UI dialog on QA row not reachable | 0 | 0 | JSON read-back in log below | UNVERIFIED |
| API key + public API | /profile?tab=security, GET /api/public/me (server/api/public.ts:453) | | create 201, /api/public/me 200 keyName match, revoke 200, /me with key after revoke 401, 0 active keys. Done in-page API (UI path passed in 07b) | 0 | 0 | JSON read-back in log | PASS |
| Digest/notification prefs toggle | /settings | 1 | PATCH includeWatchNext off/on, 200 each, restored: email digest stayed true, inApp false, weekly. No digest sent | 0 | 0 | JSON | PASS (1280 only) |
| Favorites, collections write | /api/favorites, /api/collections | | favorite add/remove, collection create/add item/remove/delete, all 2xx; read-back: favorites 0, no QA collection, bookmarks [185285,190924] unchanged. API-level, UI not clicked | 0 | 0 | JSON | PASS |
| Account deletion request/withdraw | /profile security | | POST 201 then auth/user deletionRequestedAt shows timestamp, DELETE 200, back to null | 0 | 0 | JSON | PASS |
| Loading state (fetch-delay 9s) | /bookmarks | | skeleton card grid renders, no layout error. Notifications and contributions served from query cache, no skeleton (still UNVERIFIED for those) | 0 | 0 | member/loading-bookmarks-1280.png (opened) | UNVERIFIED -> PASS for bookmarks |
| Clerk sign-in card | /sign-in | 1 | 390: card left=-28 right=372 width 400, still clipped; 768 171..571, 1280 427..827 fine | 0 | 0 | member/signin-390.png (opened) | BUG-t-auth-1 |

## Re-checks on 1cd25ab0
- BUG-t-auth-1: STILL PRESENT (numbers above).
- BUG-t-auth-2: STILL PRESENT. Admin state, GET /api/auth/user aborted, /admin after 20s: banner "We couldn't verify your sign-in status" plus "your session has expired — sign in again". Evidence member/admin-abort-1280.png (text read, screenshot not opened).
- deletionRequestedAt-null candidate: NOT REPRODUCED. Pending shows ISO timestamp (2026-11-07T20:42:59Z), null after withdraw. toClientUser returns it (auth-user.ts:81). Drop candidate.
- Onboarding local-draft: STILL PRESENT. Prefs null rev 67; Continue on step 1 (PUT 200); DELETE /api/user/preferences 200 (rev 69); reload /onboarding opens ?step=2 "What do you want to explore?". Evidence member/onboarding-stale-draft-1280.png (not opened; URL and heading read). Local draft key removed afterwards. Server prefs net null, but revision 50 -> 69 over runs (irreversible counter).
- BUG-t-member-account-1 (profile load fires POST /api/recommendations): mechanism still present on 1cd25ab0 (aborted by guard).

## Findings
BUG-t-member-account-1 (major, repeat), BUG-t-member-account-2 (minor, repeat), BUG-t-auth-1 (minor, repeat), BUG-t-auth-2 (minor, repeat). No new defects found. Schema per LANE-RULES not re-expanded here; ids and repro unchanged from 07b findings.jsonl.

## Write log (all undone and read back)
| write | undo | read-back |
|---|---|---|
| PUT /api/journeys/10/progress mark step x3 (1280/768/390) | undo click x3 | completedSteps [] cur 235 after each |
| POST /api/resources row 190989 qa-audit-20261107c-member-1 | POST withdraw 200 | contributions status withdrawn; GET /api/resources/190989 404; search total 0; sitemap qa-audit hits 0 |
| POST /api/resources/190989/edits (edit 156) | withdraw 200 | status withdrawn |
| POST /api/user/api-keys qa-audit-20261107c-member-1 | DELETE 200 | /me 401, 0 active keys |
| PATCH /api/notification-preferences includeWatchNext x2 | restored | emailDigest true, inApp false, includeWatchNext true, weekly |
| POST+DELETE /api/user/deletion-request | withdrawn | deletionRequestedAt null |
| PUT /api/user/preferences (onboarding Continue) + DELETE | reset | preferences null |
| favorite 185285 add/remove; collection create/item/delete | removed | favorites 0, collection absent, bookmarks unchanged |

## Escaped recommendation POSTs
0. Every POST /api/recommendations in the log had no status (aborted). Loads: ~30 signed-in page loads, all after the route abort.

## Non-GET table
| method | path | status | count |
|---|---|---|---|
| POST | /api/recommendations | aborted | about 8 page loads |
| PUT | /api/journeys/10/progress | 200 | 6 |
| POST | /api/resources | 201 | 1 |
| POST | /api/resources/190989/edits | 201 | 1 |
| POST | /api/user/contributions/{edit,resource}/:id/withdraw | 200 | 2 |
| POST / DELETE | /api/user/api-keys | 201 / 200 | 1 / 1 |
| PATCH | /api/notification-preferences | 200 | 2 |
| POST / DELETE | /api/user/deletion-request | 201 / 200 | 1 / 1 |
| PUT, DELETE | /api/user/preferences | 200 | 1, 1 |
| POST / DELETE | /api/favorites/185285 | 200 / 200 | 1 / 1 |
| POST, DELETE x2 | /api/collections, items, collection | 201, 200 | 1,1,1 |

## Round 2 (lead items a-d), 20:45Z to 20:59Z, revision 1cd25ab0
Evidence dir: e2e-evidence/prod-ops-2026-11-07/member/

(a) Keyboard-only, 1280, Tab x22, every stop reports outline or shadow focus indicator (22/22 on each): bookmarks, submit, settings (member), sign-in (guest session; the first sign-in run was on a signed-in member and bounced to Home, discarded). Screenshot kbd-submit.png opened: 2px red ring visible on a footer link, validation errors shown after tabbing the empty form. kbd-bookmarks/settings/signin.png taken, not individually opened. RESULT: works.

(b) Writes at 768 and 390, via UI, each on a new QA row, undone and read back:
- Submit: member-3 at 768 (POST /api/resources 201, id 190992) and member-4 at 390 (201, id 190993). Both withdrawn 200, GET /api/resources/<id> 404 each. Withdraw by in-page POST, UI withdraw path passed in 07b. Screenshots submit-success-768.png, -390.png taken, not opened.
- Prefs toggle (Digest sections > Watch next, Save choices) at 768 and 390: PUT /api/notification-preferences 200 each way; read-back [emailDigest true, inApp false, watchNext false] then restored to true, weekly. First attempts at 1600/2600 tall viewport missed the Save button (below fold, headless trap); redone at 3200 and 4200 and worked. prefs-saved-390.png (opened, pre-fix run, shows unchecked Watch next but no request): superseded. RESULT: works.

(c) Loading skeletons with fetch delay (6-8 s, patched fetch before SPA nav; notifications via --init-script from process substitution, no file): contributions 17 skeleton nodes at 3 widths (loading-contributions-390.png opened: header real, metric tiles skeleton); notifications 3 skeleton rows at 3 widths (sheet-loading-notifications.png opened). RESULT: works. Earlier "UNVERIFIED" closed.

(d) Edit-suggestion UI dialog on a QA row: row 190991 submitted by me (201), approved by admin lane about 20:52Z, page /resource/190991 loaded, Suggest Edit dialog opened (Title/URL/Description prefilled), description changed, Submit Edit Suggestion: POST /api/resources/190991/edits 201 (edit 157), toast "Edit Suggestion Submitted" (edit-submitted-1280.png opened), withdrawn 200 (contributions: edit 157 withdrawn). Hidden write: POST /api/interactions 201 on the resource view (signed-in view interaction, as documented). Admin unapproved (200) and deleted (200) at 20:53:44Z (admin message); my own read-back ran later at 20:58:45Z: /api/resources/190991 404, /resource/190991 404, search total 0, sitemap qa-audit hits 0. Header count was 4,065 during the window and 4,064 before. Approved window 20:51:56Z to about 20:53:40Z per admin, under 2 min, inside the 5 min condition. Digest health read first by admin: queue empty, nothing processing, no export or backup. RESULT: works.

Round 2 write log additions: rows 190991 (approved then deleted by admin), 190992, 190993 withdrawn; edit 157 withdrawn; prefs toggled and restored x4. Non-GET additions: POST /api/resources 201 x3, POST edits 201 x1, POST withdraw 200 x4, PUT notification-preferences 200 x4, POST /api/interactions 201 x1.
QA rows left in DB: 190989, 190992, 190993 as status withdrawn (404 public); admin may delete if wanted. 190991 deleted.

## Owner questions (not results)
1. Recommendations panel with real content, Refresh and feedback buttons call the paid Claude route. Do you authorise a budget of N paid calls, or accept that they stay unverified?
2. Empty states for profile, notifications, bookmarks, journeys need an account with no data. May a throwaway Clerk account be created and later deleted by an admin, or should they remain unverified?
3. Start Journey on a not-yet-enrolled journey creates step rows with no un-enrol route. Do you accept one permanent enrolment on the audit member?

## Round 3 (member-r2), revision 1cd25ab0
Method: I did not repeat the writes; the predecessor's writes and read-backs stand. I opened every screenshot it had not viewed, and re-measured one layout at 390 (session po1107-member-r2-1, notifications, no write, 0 POSTs fired).

1. Edit-suggestion dialog (row 190991 window): PASS with screenshots. edit-dialog-1280.png (opened): "Suggest edit" dialog, Title/URL prefilled, Description edited with focus ring, Category Community & Events, Cancel and "Submit Edit Suggestion" buttons. edit-submitted-1280.png (opened): toast "Edit Suggestion Submitted ... View status". API: POST edits 201 (edit 157), withdrawn 200. Row deleted by admin; read-back 404, search 0, sitemap 0. No further admin window needed.
2. Keyboard 1280 (kbd-bookmarks, kbd-settings, kbd-signin, kbd-submit all opened): visible 2px red focus ring on every stop shown: bookmarks status select, settings Cadence select, submit footer link, sign-in footer "Infrastructure" link. 22 of 22 Tab stops report an indicator. Gap: the sign-in shot is after 22 tabs, so it shows only the footer; reaching the Clerk Continue button was not captured in a screenshot. Result: works, sign-in primary-action reach UNVERIFIED by image.
3. Writes 768/390: submit-success-768.png and -390.png opened: "Submission Successful!" panel plus toast at both widths. Rows 190992 (768) and 190993 (390) withdrawn 200, GET 404. Prefs toggle at 768/390 restored (emailDigest true, weekly). Names used were predecessor's member-3/-4, not member-r2-n; no new rows created by me.
4. Skeletons (loading-contributions-1280, loading-notifications-1280/-390 opened): contributions shows real header and filters with grey blurred skeletons for the 4 impact tiles and first timeline row; notifications shows header plus 3 skeleton rows at 1280 and 390. Works. 768 files not opened individually (listed in sheet earlier).
5. Owner questions unchanged (below).

NEW-MR2-1 WITHDRAWN (by design): client/src/styles/shell/layout.css:55-66 reserves the back-to-top lane at the end side (padding-inline-end max(page-pad-x, back-to-top-lane - free)) and sets start padding 20px under 640px; 07b withdrew the same finding twice (t-member-content, t-admin-curation). Original note follows, kept for the record.
Original: (minor, layout, 390): content column is not centred. Measured on /notifications at 390: viewport 390, clientWidth 384, main 0..384, card 20..324. Left gutter 20, right gutter 60. Same right edge (about 330 of 384) in notifications-390, submit-390 and the footer cards, so it is site-wide at 390 for these pages. Evidence: member/notifications-390.png, submit-390.png (opened). Not checked at 768.

Escaped recommendation POSTs in round 3: 0 (route aborted before load; one signed-in page load by me).
Non-GET added by me: none. Secrets exposed: none.

## Round 3 addendum (lead 21:31Z)
- NEW-MR2-1 marked WITHDRAWN (by design), see above.
- Sign-in keyboard reach CLOSED: guest session po1107-member-r2-2, 1280, fresh /sign-in, Tab from page top. Tab 15 = Clerk email input (name identifier), Tab 16 = Continue button; 15 stops before email (skip link, logo, search, 4 nav links, header Sign in, 5 stops in the Clerk social row, Use phone). Both stops show a 2px red focus ring. Screenshots opened: e2e-evidence/prod-ops-2026-11-07/member/kbd-signin-email-1280.png, kbd-signin-continue-1280.png. Nothing typed or submitted; 0 non-GET.
