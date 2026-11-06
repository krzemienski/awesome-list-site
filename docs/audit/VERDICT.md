# awesome.video audit verdict (2026-11-03, close-out)

**Verdict: PASS WITH OPEN ITEMS.** Every bug this run found is fixed, deployed with replit-deploy and re-measured on the live site. No ledger row is still failing. Some inventory rows still lack one state or width, and four content questions belong to the owner, so this is not a clean full-coverage PASS.

Production at close-out: `cf3a8403` (#207, live 16:51:33Z) (`/api/version`, `/api/health/ready` 200), equal to `origin/main`. Superseded by the C18 section below: production is now `7c6b1b93`.

## Bugs fixed and verified on production in this session

| ID | Defect | PR | Prod evidence |
|---|---|---|---|
| CAT-02/SSC-02/JN-02/AU-20 (+5) | Admin load-error Retry dropped focus to body | #198 | Retry -> H1 on 9 surfaces x 3 widths |
| C6-MB-042 (+1) | 32px links at touch widths | #199 | 258x44 @390, 660x44 @820 |
| C6-PC-030 | Tag popover clipped at 390 | #200 | popover 0..406 @390 |
| C6-MB-011 | Account modal cut off below ~920px | #201 | 16..374 @390, 16..804 @820 |
| C6-PC-038 | Taxonomy links dropped `?kind=` | #201 | all hrefs keep `?kind=tools` |
| AI-02 | Researcher low-budget warning missing at $0.30 | #203 | $0.30 warns @1440/390 |
| C6-MB-028 | Bulk archive-all dropped focus to body | #204 | focus -> H1 / Select all @1440, 820 |
| MB-073-COPY | Onboarding save showed "Failed to fetch" | #204 | "Could not reach the server..." |
| AI-22-ACK | Enrichment plain-HTTP ack row 16px tall @820 | #205 | 642x44 @820, 244x56 @390 |
| MB-015-COPY | Profile name/withdraw toasts showed "Failed to fetch" | #205 | friendly text on both |
| MB-043-COPY | Contribution withdraw and home-layout errors showed "Failed to fetch" | #206 | friendly text @1440/390 |
| MB-043-FOCUS | 409 withdraw dropped focus to body | #206 | focus -> contribution row |
| MB-013-FOCUS, MB-013-RING | Key revoke dropped focus; row had no focus ring | #206, #207 | focus -> revoked row with visible ring @1440/390 |

Also re-checked on production and closed: C6-AX-021 (admin stats failure shows an error card with Retry, no zeros), AI-08 and AI-22 at all three widths, C6-MB-012/014/015/063, C6-PC-054, MEM-audit-defect-4.

## Bug ledger (BUG_LEDGER.md)

459 rows. The inherited "re-check on production" rows were each driven again on production and given one of these statuses.

| Current status | Rows |
|---|---|
| fixed-verified on production | 371 |
| partial (one state or width not driven; gap named per row) | 40 |
| unverified (reason per row) | 20 |
| withdrawn (by design or a tool artefact) | 23 |
| owner decision | 5 |
| still failing | 0 |

## What was not verified, and why

- **Partial/unverified rows** each name the gap. The common reasons are: a real touch device or screen reader; data that does not exist on production (an expired API key, more than one page of contributions, notifications a member cannot create, an empty discovery queue); a paid or live-write action (enrichment run, GitHub sync, researcher run); and theme, font or appearance changes, which the run rules forbid.
- **MEM-migration-chain:** production reports 34 of 34 migrations applied. Replaying the chain on a fresh database was not run, because this run tests on production only.
- **Test suite:** the repo has none (removed in b4040bfe). Every merged commit passed `npx tsc --noEmit` and `npm run build`. Whole-repo `eslint .` still fails on about 4.4k old type-strictness errors; each fix PR compared eslint before and after on the files it touched.

## Owner decisions open

1. **PC-12:** resource 190151 "MirrorFly IM Software" is off-topic and has the tag typo "enteprise". Unpublish it, fix the tag, or keep it.
2. **DATA-TAXO-LABEL / AI-16:** some subcategory names lost punctuation at import ("RTMPRTSPHTTP Protocol Servers"). Renaming live taxonomy is your call.
3. **DATA-ENTITY-DESC:** resources 189157 and 189065 show a literal `&lt;` in their descriptions. These are imports from before the decoder fix (9a269154); fixing them means editing real content.
4. **DATA-DUP-TITLE:** 61 groups of resources share a title. Merging or renaming them is a content decision.
5. **EN-17-COPY:** enrichment has no small run; a full run costs about $21 for 3,012 resources.

## Test data

All audit records created on production were deleted and read back (QA ledger: 23 records, 0 open; evidence in `e2e-evidence/c17-cleanup/`):

- Submissions 190921, 190922 and 190923 (`[QA-audit-1103]` titles): `DELETE /api/admin/resources/:id` 200; absent from admin search; public URL 404.
- Audit member `krzemienski+audit202611031454@gmail.com`: `DELETE /api/admin/users/:id` 200 with the Clerk identity deleted; its journey progress, preferences and revoked API keys cascade with it; absent from the 140-user list.
- Earlier in the run: submission 190920 and audit member `krzemienski+audit202611031301@gmail.com`, plus fixtures deleted as each lane finished.

One side effect stays: audit-log row TX#29386 (a `database.exported` entry from a read-only leak check).


## C18 remediation (47-finding black-box audit, 2026-11-03)

**Final production revision `7c6b1b93`** (= origin/main; `/api/version` and `/api/health/ready` 200). Fix PRs #209–#219, each independently reviewed (sonnet), squash-merged with a merged-tree gate (`tsc` 0, `npm run build` 0), deployed with replit-deploy, and re-checked on production.

Completion table with one evidence path per finding: `docs/audit/C18-COMPLETION.md`.

| Result | Findings |
|---|---|
| PASS on production | 47 of 47 |

Catalog data edits (reversible, before/after logged in `e2e-evidence/c18-f/applied.md`): 186041 URL, 186212 description, 4 retitles, 3 archived duplicates or dead links, 3 Stanford links moved to archive.org snapshots, subcategory 2233 renamed.

P0 journey smoke: 18/18 PASS at 1440 and 375 (`e2e-evidence/c18-final/SM/`).

Owner decision:
- BUG-003. Mixpanel now sends after an explicit "Allow analytics" even when the browser sets Do Not Track (`ignore_dnt`), the same as PostHog and Amplitude. The Privacy Policy does not mention DNT.

Follow-up bug (not one of the 47): On a throttled first load, text typed into the hero search box before hydration is cleared by hydration.

## C22 (2026-11-05, admin + member coverage on post-C17 code)

**Verdict: PASS WITH OPEN ITEMS.** The 22 defects this cycle found are fixed, deployed with replit-deploy and re-driven on the live site. No inventory row is failing. The 613-row tally below was taken on the owner session and in-page mocks; the 82 member rows plus SH-05 and SH-11 were then re-driven signed in as a real non-admin member (see "Member re-drive with a real non-admin account"), which leaves 7 PARTIAL and 2 UNVERIFIED among those 84, each with a reason. Production: `f345225d`.

Not a clean full-coverage PASS: 3 rows are OWNER-BLOCKED, the member re-drive has the PARTIAL and UNVERIFIED rows named below, and rows labelled "client handling, server path simulated: in-page mock" prove the client only (see "Limits of the last 16"). Sign-up was driven for real on 2026-11-06 by the new member.

### Defects fixed and verified on production

| ID | Defect | PR | Prod evidence |
|---|---|---|---|
| C22-MB-055 | Raw "Failed to fetch" in 8 error messages | #252 | notification save offline -> "Could not reach the server…" @1440/390 |
| C22-SH-14 | Dashboard Retry fails again -> focus `#main` | #253 | -> new Retry; success -> H1 @1440/390 |
| C22-SC-24 | Taxonomy parent-load Retry success -> focus body | #253 | -> H1; fails again -> new Retry @1440/390 |
| C22-RS-34 | Failed research run showed raw provider error + "relaunch it" | #254 | settings sentence, no relaunch advice @1440/390 |
| C22-MB-075 | Offline save paused silently (all writes) | #255 | offline note save -> "Couldn't update your library" toast @1440 |
| C22-RM-CLEAR | "Clear filters" 76x24 at touch widths | #256 | 76x44 @820/390, 24 @1440 |
| C22-EX-09 | Export link-check Retry fails again -> focus H1 (wrapper unmounts) | #257 | fast + 1.5 s failure -> new Retry, success -> H1 @1440/390 |
| C22-MB-PROFILE-LINK | Profile Favorites/Bookmarks title links 32px at touch widths | #259 | 14 links 44px @820/390, 32px @1440 |
| C22-LH-CHUNK | Stale admin tab chunk after a deploy -> "tab crashed" card with a dead Retry | #260 | chart chunk blocked -> one reload, hash kept, dashboard renders @1440 |
| C22-EN-25 | A busy button that disables itself drops focus to body (failed enrichment/research-run cancel, journey Add step/Move) | #262 | focus held on the confirm through pending and failure @1440/390 (EN-25, RS-31, JN-28) |
| C22-AU-19 | Contact inbox 404 said "endpoint returned 404"; Try again lost focus | #262, #263 | plain copy; 1.5 s 404 repeat -> new Try again, success -> H1 @390/1440 |
| C22-EX-24 | Validation warnings clipped, unreachable at 390 (vertical-only scroll area kept content-width box) | #264 | viewport 232/232, 0 rows overflow @390 |
| C22-EX-27 | Backup contents toggle wider than its card at 390, card scrolled sideways | #264 | toggle wraps 262x62, card scrollLeft 0 @390 (real backup) |
| C22-EN-24 | Successful cancel removed the dialog's opener; focus to body | #265 | focus to H1; nested Steps > Delete step keeps focus in the Steps dialog @1440/390 |
| C22-EX-08 | Export "Cancel link check" unmounted on success; focus to body | #267 | focus on the job heading ("Link check #N Cancelled") @1440/820/390 |
| C22-LH-32 | Remediation "Link is fine" / "Resume checks" names didn't contain their visible label (WCAG 2.5.3) | #267 | 259 names start with the visible label, e.g. "Link is fine for Wirecast" @1440 |
| C22-DB-09 | Clear & Re-seed toasts said "Database Seeded Successfully" / "Database Seeding …" while the panel said "Clear & Re-seed completed"; the partial panel title ignored the mode too | #269, #270 | seed endpoint blocked and mocked: reseed ok / partial / 500 toasts read "Clear & Re-seed Completed / Partially Failed / Failed", plain seed unchanged @1440, ok @390 (#269 on `4bf7604d`); #270 partial panel title checked after this deploy |
| C22-MB-DIGEST-UNVERIFIED | A member with an unverified email could turn on the email digest (PUT /api/notification-preferences 200, `emailOptedInAt` set). Clerk prod has `verify_at_sign_up` off, so new accounts are never verified (security) | #275 | on `d8dc0b2c` as the member: full payload with `emailDigestEnabled:true` -> 400 "Verify your email address before turning on email digests.", read-back false; UI Save shows the same message (m3). The digest job also skips unverified recipients at send time |
| C22-MB-LAYOUT-DISCARD | /settings Home layout radio saves at once and silently reverted unsaved learning-preference edits (C6-MB-060) | #276 | on `d8dc0b2c` @390: unsaved Advanced skill level survives a Curated then Index click; nothing saved, layout back to Index |
| C22-MB-AUTH-OFFLINE | Offline, Continue on Clerk's sign-in and sign-up forms did nothing and said nothing (C6-MB-032 offline) | #277 | on `d8dc0b2c` @1440/390: offline notice "Could not reach the server. Please check your connection and try again." (role=status) on /sign-in and /sign-up, gone when back online |
| C22-MB-003 | Name editor showed "Name updated" for an unchanged name, could not clear the last name, and prefilled by splitting a display string | #278 | on `f345225d` @1440/390: dialog prefills stored first/last; clearing first keeps last (PATCH 200); clearing both shows "Enter at least a first or last name." with no request; restored to "[AUDIT]" / "C22 Member" |
| C22-EX-VALSTORE | The awesome-lint validation result lived in server memory, so every publish or restart cleared it | #274 | persisted in App Storage on `7e12d9c9`; the result survives a restart, proven by a republish (owner decision resolved) |

Deploys: cc0769a5 -> 5dc0ce4a -> e79a51bb -> 125a7be3 -> 721f528c -> 62dd171e -> 8a45cbe2 -> f3ac0de1 -> f65d8199 -> f0d32530 -> d49e6ec0 -> eda53760 -> 018764ea -> 9c8f3539 -> 96660bcd -> 4bf7604d (evidence `e2e-evidence/replit-deploy/2026-11-05T21-38-27Z` onward).

### Coverage (613 admin + member inventory rows)

Every row has a C22 verdict line in the lane files `reports/prod-audit-2026-10-29/cycle-22/c22-{admin-content,admin-shell,admin-ops,member}.md` (local audit workspace, not committed, like cycles 17 and 21). Width cells were then completed by lanes p1–p8 (`cycle-22/p{1..8}-*.md`, every row stamped `8a45cbe2` from p4 on). Recount combining every per-width line across all twelve lane files (`e2e-evidence/c22/lead/final-recount-8a45cbe2.txt`): PASS 495 · PARTIAL 10 · UNVERIFIED 102 · OWNER-BLOCKED 3 · FAIL→FIXED-VERIFIED 2 · n/a 1 · open FAIL 0. PASS means every width cell passed on some line. The first close-out tally (PASS 247 · PARTIAL 255) counted width cells written as a bare "UNVERIFIED" as results; 366 rows needed those cells driven, and they were.

The 102 UNVERIFIED rows were then driven by lanes q1–q4 (`cycle-22/q{1..4}-*.md`; recount `e2e-evidence/c22/lead/unverified-102-recount.txt`). Server states production can't produce (empty lists, active jobs, delays, 404/409/500) were rendered with an in-page `fetch` wrapper, every write guarded by an exact-URL abort route proven blocked first and aimed at nonexistent ids; those rows say "client handling, server path simulated: in-page mock". The owner approved four real actions once each (validation run, database backup, a $0.30-capped researcher run and a batch-1 enrichment start, both cancelled at once; about $0.11 total). Result: PASS 78 · FAIL→FIXED-VERIFIED 8 · UNVERIFIED 16.

The 10 PARTIAL rows were then completed by lanes r1–r2 (`cycle-22/r{1,2}-*.md`; recount `e2e-evidence/c22/lead/partial-10-recount.txt`), again with guarded in-page mocks; the paid recommendations Refresh and the unsubscribe POST were blocked from the network and answered in the page. Result: PASS 8 · FAIL→FIXED-VERIFIED 1 (EX-08) · PARTIAL 1 (LH-32: real touch needs a device; keyboard, targets and reduced motion pass).

The last 16 UNVERIFIED rows were then driven by lanes s1, s2 and t1 (`cycle-22/s1-*.md`, `s2-identity.md`, `t1-touch.md`; recount `e2e-evidence/c22/lead/last16-recount.txt`). s1 drove the 9 owner-declined job rows with a double guard: the in-page wrapper never forwarded seed-database, link-health/run, check-links or GitHub import/export, and exact-URL abort routes blocked the same paths, both proven by GET/HEAD before any click; link-health stayed at job 14 and GitHub sync history at 49. s2 drove the 5 sign-in and member rows by mocking `/api/auth/user` to a member role and the login POST, with no real login or sign-out. t1 drove SH-44 and C6-MB-077 with real touch input (`adb input tap/swipe` into Chrome 109 on an Android 13 emulator; every event `pointerType: touch`, `isTrusted`), including reduced motion (`animator_duration_scale 0`). Favorite, bookmark, collection and preferences writes were answered in the page. Coarse-pointer CSS was read in desktop Chrome with `primaryPointerType=2`, because the emulator reports a fine pointer and its Chrome is below the CSS floor (Chrome 111). Result: PASS 15 · FAIL→FIXED-VERIFIED 1 (DB-09).

The last PARTIAL row, LH-32, was then driven by real touch (recount `e2e-evidence/c22/lead/lh32-recount.txt`). Lane t2 used Chrome 109 on the Android 13 emulator (`cycle-22/t2-lh32-touch.md`). Every Link Health control family was tapped: tab-strip swipe, More/Less, trend tooltip, Report status, Run full check (Cancel, then a mocked confirm), Cancel running scan, Apply, Link is fine / Resume checks, table swipes, link-report Resolve/Dismiss, and the member Report broken link. Every write was double-guarded and answered in the page; link-health job 14, 172 planned actions, 0 ignored and 0 reports were unchanged. Reduced motion with `animator_duration_scale 0` collapsed More with no running animations. t2 flagged "Less" under the consent banner at the page end. On an Android 15 emulator with Chrome 124 (above the CSS floor), the end of the page is reachable and Less is uncovered and tappable there. The covered state only appears short of the end, after Chrome's toolbar reappears. The short swipes that seemed "pinned" were scrolling the Problem Links table's own 400 px scroller (`LinkHealthDashboard.tsx:859`), not the page: the filter above the table stayed put while its rows moved. A swipe started outside the table reaches the end. Result: PASS.

**Final C22 count (613 rows): PASS 597 · FAIL→FIXED-VERIFIED 12 · PARTIAL 0 · UNVERIFIED 0 · OWNER-BLOCKED 3 · n/a 1 · open FAIL 0.**

PARTIAL (10), with reasons: SC-14 / SSC-15 duplicate-slug state at 390; RS-51, GH-15, EX-08, AU-17 need job or run states that don't exist on prod; LH-32 real touch and reduced motion; C6-MB-007 / C6-MB-040 recommendations Refresh is a paid run; C6-MB-057 needs a real emailed unsubscribe token. Public routes were smoke-checked on cc0769a5 by the lead: 18 routes 200, 404, auth redirects, admin APIs 401, no console errors or failed requests at 1440/390. The 47 public findings stand from C20 (47/47).

### Limits of the last 16
- The 14 s1/s2 rows prove client handling only; the server path is simulated. Real job starts, imports, exports, seeds and an owner sign-out stay owner-declined or forbidden by the audit rules. A member login and sign-out were later driven for real (see the member re-drive).
- No collection exists on the owner account, so "add to an existing collection" was not exercised; the section and the New collection dialog were.
- LH-32's job, apply, ignore and report writes are simulated in the page too (all 6 write paths double-guarded); the touch behaviour is real.
- Sub-item: EX-23 Errors (N) on the real validation result has 0 errors to show (mocked PASS stands).

### Member re-drive with a real non-admin account (2026-11-06)

The owner ruled a functional validation incomplete without a real non-admin member. Before this, the member rows had been driven as the owner or on in-page mocks.

**Method.** The member `user_3Lk0O4nWTo2VnwbqvnFWyoCDyPo` (role `user`) was created through the production sign-up form on the Clerk PRODUCTION instance, with a real mail.tm inbox (codes are emailed; prod rejects `+clerk_test` addresses and `424242`, and the workspace `CLERK_SECRET_KEY` is the dev instance, so it cannot make prod users). Five lanes then re-drove every member row signed in as that member (`cycle-22/m0-auth.md`, `m1-member-a.md`, `m2-member-b.md`, `m3-member-c.md`, `m4-touch.md`), at 1440, 820 and 390 where the layout changes. Real writes went to the member's own account only, each logged in `cycle-22/member-ledger.md` and undone. The only paid AI call was one recommendations refresh (17:21:42Z). Member-lane revisions: `92a86620`, `7e12d9c9`, `d8dc0b2c`, `f345225d`. The recount (`e2e-evidence/c22/lead/member-recount.txt`) takes the latest verdict per row: m3 over m2 for 041-081, m4 for 077, m0's post-deploy checks for 003, 042 and 044.

**Totals (84 = 82 member rows + SH-05 + SH-11): PASS 73 · FAIL→FIXED-VERIFIED 2 · PARTIAL 7 · UNVERIFIED 2 · open FAIL 0.**

- FAIL→FIXED-VERIFIED (2): C6-MB-003 (name editor, #278) and C6-MB-060 (home layout discarded unsaved learning edits, #276).
- Two more defects came from rows that were not scored FAIL: C22-MB-DIGEST-UNVERIFIED (#275, found by m2 as an extra security check on the notifications rows) and C22-MB-AUTH-OFFLINE (#277, found by m0 on C6-MB-032).
- PARTIAL (7):
  - C6-MB-031: the loading skeleton was not seen (no throttling available) and the load failure was produced by aborting the request.
  - C6-MB-042: the rejected state passes at three widths; superseded and edit-change states need an admin action on the member's submission.
  - C6-MB-044: no-matches and the Rejected filter pass; pagination needs 13 submissions (page size 12) and the lane allowed one; loading and error not seen.
  - C6-MB-051: the all-caught-up state passes; "Mark all read" on two or more unread items, loading and failure were not seen (only one inbox item ever arrived).
  - C6-MB-055: success and offline pass; a server-side save failure can't be produced.
  - C6-MB-063: empty and offline-error states pass; a real (online) load error and the loading skeleton were not seen.
  - C6-MB-073: offline save failure passes; the preference/category load failure was not reachable (the page rendered cached data offline).
- UNVERIFIED (2):
  - C6-MB-057: no digest email exists (digests stay off for an unverified address), so the real emailed unsubscribe link could not be used; only the invalid-token page was seen.
  - SH-05: `/sign-in?admin` is the owner-password form and no member lane drove it (it is not in `m0-auth.md`); the earlier mock lane s2 passed it on an in-page mock, which proves the client only.
- PASS rows that carry a stated gap: C6-MB-007 (no busy indicator or refresh toast seen), C6-MB-049 (submit pending state not seen), C6-MB-056 (loading and error not seen), C6-MB-074 (docs page not driven), C6-MB-080 (Suggest edit not driven), and C6-MB-032 (the merge message was seen on C6-MB-001). Many member rows were driven at 1440 only, as each lane file states.
- SH-11 passes: the member sees "Admin Dashboard" with a "doesn't have the admin role" alert, every admin API read returns 403, and "Back to home" activates to `/` with focus on the H1 at 1440 and 390.
- C6-MB-077 passes on real touch: an Android 15 emulator with Chrome 124, `adb input` taps, every event `pointerType: touch` and trusted.

### Notes (not defects)
Member re-drive: the Android soft keyboard covers the Save/Cancel footers in the New collection and Edit name dialogs (the X close stays reachable); a tap outside the account menu leaves focus on `main`, while Escape returns it to the avatar; saving learning preferences also marks onboarding completed; the timezone can't be reset to null (the API answers 400); journeys have no un-enrol control; the contributions status filter label updates 2-6 s before the list; the Submit "Keep editing" button focuses the page container, not Cancel. Owner decision: the Clerk dashboard setting `verify_at_sign_up` stays off. Turning it on would also verify at sign-up; the #275 app fix holds either way.

Concatenated-URL edit (valid WHATWG URL), sub-subcategory slug uniqueness per level, signed-out /admin redirects instead of a gate button, dialog Retry focus lands on the dialog, research config-load error has no Retry, GitHub heading on config failure, Link Health remediation table unpaginated (259 rows), whole Export tab `aria-busy` for ≤10 s during a link-check retry. From the width lanes: Users Retry that fails again hands focus to the search box (deliberate, `UsersTab.tsx:117`); Link Health Retry shows focus on body for ~0.3 s before it settles on Retry; Researcher launch marks only the first invalid field (`ResearchLaunchGuide.tsx:199`); a dialog reopened from cache keeps its last good data until a refetch fails; icon-only GitHub "Reset to configured repository" at touch widths is named by its title. From the mock lanes: Database "None of the key tables exist" is accurate (the server lists only key tables that exist, `AdminRepository.ts:265`); with no repository configured the GitHub Pull/Sync buttons are disabled and the reason sits in the collapsed "More" field; the enrichment active-job monitor lives inside the collapsed "Job controls & monitoring"; the admin tab-strip scroll arrows work with a real pointer (a DOM click never fires the pointerdown that releases auto-reveal). From the partial lanes: an in-flight GitHub sync job gets the neutral status chip (`StatusChip` has no "processing" tone); the taxonomy duplicate-name 409 shows a banner but marks no field invalid (the body has no fieldErrors); the Link Health remediation list is unpaginated (~518 Tab stops); a used unsubscribe link shows the confirm page before "Link unavailable" (the GET doesn't check the token). From the touch lane: a tap outside the account menu leaves focus on `main`, while Escape returns it to the avatar; a tapped toast stays open while it holds focus and can cover the button beneath it until the next tap; the Android soft keyboard covers a dialog's Cancel button, which the X still closes; the hover-only Users row actions are reached on touch through "Row actions". From the LH-32 lanes: at 390 the Problem Links table is a 400 px inner scroller that takes most of the space between the header and the consent banner, so a swipe that starts on it scrolls the table, not the page, until the table reaches its end; the link-report dialog keeps its note text after Cancel.

### Test data
Every C22 write is in `reports/prod-audit-2026-10-29/cycle-22/qa-ledger.md` and closed. Lead read-back at close-out: 0 `[AUDIT] C22` resources (public search 0; 190925–190935 all 404), 0 audit taxonomy items, pendingApprovals 21 (all real), pendingEdits 0, owner collections [], no active API keys, 12 bookmarks, favorites [185551, 186357], name "Admin User", onboarding completed/step 5 with original values, notification prefs original values. Irreversible side effects: preference `updatedAt` / revision counters (160 → 168) and `inAppOptedInAt` timestamps changed; values are identical. Three append-only audit-log rows (`users.exported` #29652–#29654) from Users Export CSV presses. Journey progress `lastAccessedAt` may have moved on one Resume click. Owner-approved, irreversible: validation result (0 errors, 16 warnings; in-memory, already gone after the next deploy), backup `20261106T020839Z-7b26b348` (5.8 MB, private storage, never downloaded), researcher job 109 and enrichment job 37 (both cancelled, ~$0.11 total).

Test-member residue (2026-11-06 member re-drive; every other member write was undone, see `member-ledger.md`): the member account itself (kept for future audits); withdrawn submission 190944 and rejected submission 190945 (both `[AUDIT]`, never public); notification timezone UTC (the API rejects null); server theme set (editorial/crimson); journeys 10 and 6 enrolled (no un-enrol control); interaction 913 and recommendation feedback on resource 190840 (no delete routes); inbox item 14 (read); email and in-app opt-in timestamps.

Slips on real data, both reverted within minutes and read back: QA subcategory 2362 briefly created under a real category (C22-QA-2362); a stray Enter swapped steps 1 and 2 of journey 8 for about a minute (C22-QA-J8). Lead read-back after the width lanes (`8a45cbe2`): 0 `[AUDIT]` resources or taxonomy items (QA 190936–190941 all 404), 9 categories, pendingApprovals 21 / pendingEdits 0, collections [], 0 active API keys, 12 bookmarks (all saved, unarchived, no notes, no collection), favorites [185551, 186357], recommendation feedback [], name "Admin User", preferences and onboarding original, notification prefs original, journey 8 steps in original order. After the mock lanes (`eda53760`): users 140, latest jobs researcher 109 / enrichment 37 / link-health 13, GitHub sync history unchanged (49), no mocked id reached the network, owner preferences / notification prefs / bookmarks / favorites / collections / API keys unchanged (`e2e-evidence/c22/lead/owner-baseline-final.txt`). A third slip: a /tmp data file written and deleted by one lane.

### Owner follow-ups
None new from the member re-drive. The audit member account, the `.env` to Replit move (#273) and the validation-result persistence (C22-EX-VALSTORE, #274) are done. Earlier open owner decisions (PC-12, DATA-TAXO-LABEL, DATA-DUP-TITLE, DATA-ENTITY-DESC, EN-17-COPY) are unchanged.
