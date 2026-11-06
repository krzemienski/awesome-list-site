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

**Verdict: PASS WITH OPEN ITEMS.** The 16 defects this cycle found are fixed, deployed with replit-deploy and re-driven on the live site. No inventory row is failing. Production at close-out: `9c8f3539` == `origin/main` (before this docs PR), `/api/health/ready` 200.

Not a clean full-coverage PASS: 16 rows are UNVERIFIED and 1 PARTIAL, each with a reason (owner-declined jobs, no member account, the sign-in/out rules, no real touch device). Sign-up is owner-skipped.

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

Deploys: cc0769a5 -> 5dc0ce4a -> e79a51bb -> 125a7be3 -> 721f528c -> 62dd171e -> 8a45cbe2 -> f3ac0de1 -> f65d8199 -> f0d32530 -> d49e6ec0 -> eda53760 -> 018764ea -> 9c8f3539 (evidence `e2e-evidence/replit-deploy/2026-11-05T21-38-27Z` onward).

### Coverage (613 admin + member inventory rows)

Every row has a C22 verdict line in the lane files `reports/prod-audit-2026-10-29/cycle-22/c22-{admin-content,admin-shell,admin-ops,member}.md` (local audit workspace, not committed, like cycles 17 and 21). Width cells were then completed by lanes p1–p8 (`cycle-22/p{1..8}-*.md`, every row stamped `8a45cbe2` from p4 on). Recount combining every per-width line across all twelve lane files (`e2e-evidence/c22/lead/final-recount-8a45cbe2.txt`): PASS 495 · PARTIAL 10 · UNVERIFIED 102 · OWNER-BLOCKED 3 · FAIL→FIXED-VERIFIED 2 · n/a 1 · open FAIL 0. PASS means every width cell passed on some line. The first close-out tally (PASS 247 · PARTIAL 255) counted width cells written as a bare "UNVERIFIED" as results; 366 rows needed those cells driven, and they were.

The 102 UNVERIFIED rows were then driven by lanes q1–q4 (`cycle-22/q{1..4}-*.md`; recount `e2e-evidence/c22/lead/unverified-102-recount.txt`). Server states production can't produce (empty lists, active jobs, delays, 404/409/500) were rendered with an in-page `fetch` wrapper, every write guarded by an exact-URL abort route proven blocked first and aimed at nonexistent ids; those rows say "client handling, server path simulated: in-page mock". The owner approved four real actions once each (validation run, database backup, a $0.30-capped researcher run and a batch-1 enrichment start, both cancelled at once; about $0.11 total). Result: PASS 78 · FAIL→FIXED-VERIFIED 8 · UNVERIFIED 16.

The 10 PARTIAL rows were then completed by lanes r1–r2 (`cycle-22/r{1,2}-*.md`; recount `e2e-evidence/c22/lead/partial-10-recount.txt`), again with guarded in-page mocks; the paid recommendations Refresh and the unsubscribe POST were blocked from the network and answered in the page. Result: PASS 8 · FAIL→FIXED-VERIFIED 1 (EX-08) · PARTIAL 1 (LH-32: real touch needs a device; keyboard, targets and reduced motion pass).

**Final C22 count (613 rows): PASS 581 · FAIL→FIXED-VERIFIED 11 · PARTIAL 1 · UNVERIFIED 16 · OWNER-BLOCKED 3 · n/a 1 · open FAIL 0.**

PARTIAL (10), with reasons: SC-14 / SSC-15 duplicate-slug state at 390; RS-51, GH-15, EX-08, AU-17 need job or run states that don't exist on prod; LH-32 real touch and reduced motion; C6-MB-007 / C6-MB-040 recommendations Refresh is a paid run; C6-MB-057 needs a real emailed unsubscribe token. Public routes were smoke-checked on cc0769a5 by the lead: 18 routes 200, 404, auth redirects, admin APIs 401, no console errors or failed requests at 1440/390. The 47 public findings stand from C20 (47/47).

### Why rows are still UNVERIFIED (16)
- Owner declined (9): link-health scan (LH-07, EX-07), GitHub import/export (GH-06, GH-09), seed / clear-and-reseed and their results (DB-05, DB-09–DB-12).
- Audit rules / no member account (5): SH-05 (submitting the owner password is a login), C6-MB-004 (Sign out revokes every owner session), SH-11, C6-MB-001, C6-MB-032 (need a non-admin member account).
- Real touch device (2): SH-44, C6-MB-077 (device emulation sets the user agent and viewport only; no coarse pointer or touch events).
- Sub-item: EX-23 Errors (N) on the real validation result has 0 errors to show (mocked PASS stands).

### Notes (not defects)
Concatenated-URL edit (valid WHATWG URL), sub-subcategory slug uniqueness per level, signed-out /admin redirects instead of a gate button, dialog Retry focus lands on the dialog, research config-load error has no Retry, GitHub heading on config failure, Link Health remediation table unpaginated (259 rows), whole Export tab `aria-busy` for ≤10 s during a link-check retry. From the width lanes: Users Retry that fails again hands focus to the search box (deliberate, `UsersTab.tsx:117`); Link Health Retry shows focus on body for ~0.3 s before it settles on Retry; Researcher launch marks only the first invalid field (`ResearchLaunchGuide.tsx:199`); a dialog reopened from cache keeps its last good data until a refetch fails; icon-only GitHub "Reset to configured repository" at touch widths is named by its title. From the mock lanes: Database "None of the key tables exist" is accurate (the server lists only key tables that exist, `AdminRepository.ts:265`); with no repository configured the GitHub Pull/Sync buttons are disabled and the reason sits in the collapsed "More" field; the enrichment active-job monitor lives inside the collapsed "Job controls & monitoring"; the admin tab-strip scroll arrows work with a real pointer (a DOM click never fires the pointerdown that releases auto-reveal). From the partial lanes: an in-flight GitHub sync job gets the neutral status chip (`StatusChip` has no "processing" tone); the taxonomy duplicate-name 409 shows a banner but marks no field invalid (the body has no fieldErrors); the Link Health remediation list is unpaginated (~518 Tab stops); a used unsubscribe link shows the confirm page before "Link unavailable" (the GET doesn't check the token).

### Test data
Every C22 write is in `reports/prod-audit-2026-10-29/cycle-22/qa-ledger.md` and closed. Lead read-back at close-out: 0 `[AUDIT] C22` resources (public search 0; 190925–190935 all 404), 0 audit taxonomy items, pendingApprovals 21 (all real), pendingEdits 0, owner collections [], no active API keys, 12 bookmarks, favorites [185551, 186357], name "Admin User", onboarding completed/step 5 with original values, notification prefs original values. Irreversible side effects: preference `updatedAt` / revision counters (160 → 168) and `inAppOptedInAt` timestamps changed; values are identical. Three append-only audit-log rows (`users.exported` #29652–#29654) from Users Export CSV presses. Journey progress `lastAccessedAt` may have moved on one Resume click. Owner-approved, irreversible: validation result (0 errors, 16 warnings; in-memory, already gone after the next deploy), backup `20261106T020839Z-7b26b348` (5.8 MB, private storage, never downloaded), researcher job 109 and enrichment job 37 (both cancelled, ~$0.11 total).

Slips on real data, both reverted within minutes and read back: QA subcategory 2362 briefly created under a real category (C22-QA-2362); a stray Enter swapped steps 1 and 2 of journey 8 for about a minute (C22-QA-J8). Lead read-back after the width lanes (`8a45cbe2`): 0 `[AUDIT]` resources or taxonomy items (QA 190936–190941 all 404), 9 categories, pendingApprovals 21 / pendingEdits 0, collections [], 0 active API keys, 12 bookmarks (all saved, unarchived, no notes, no collection), favorites [185551, 186357], recommendation feedback [], name "Admin User", preferences and onboarding original, notification prefs original, journey 8 steps in original order. After the mock lanes (`eda53760`): users 140, latest jobs researcher 109 / enrichment 37 / link-health 13, GitHub sync history unchanged (49), no mocked id reached the network, owner preferences / notification prefs / bookmarks / favorites / collections / API keys unchanged (`e2e-evidence/c22/lead/owner-baseline-final.txt`). A third slip: a /tmp data file written and deleted by one lane.

### Owner follow-ups
Create a non-admin audit member account (or allow sign-up) to verify member sign-in, sign-out and non-admin denial. Move the workspace `.env` / `.env.local` values (public VITE_* config and dev host flags, no credentials) to Replit Secrets. Decide whether the awesome-lint validation result should survive restarts (C22-EX-VALSTORE: it lives in server memory, so every publish clears it; persisting it needs a DB table, a production schema change). Earlier open owner decisions (PC-12, DATA-TAXO-LABEL, DATA-DUP-TITLE, DATA-ENTITY-DESC, EN-17-COPY) are unchanged.
