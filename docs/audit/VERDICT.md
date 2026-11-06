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

**Verdict: PASS WITH OPEN ITEMS.** The 9 defects this cycle found are fixed, deployed with replit-deploy and re-driven on the live site. No inventory row is failing. Production at close-out: `8a45cbe2` == `origin/main` (before this docs PR), `/api/health/ready` 200.

Not a clean full-coverage PASS: 102 rows are UNVERIFIED and 10 PARTIAL, each with a reason in its row. Sign-up is owner-skipped, and signed-in non-admin denial needs a member account that doesn't exist.

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

Deploys: cc0769a5 -> 5dc0ce4a -> e79a51bb -> 125a7be3 -> 721f528c -> 62dd171e -> 8a45cbe2 (evidence `e2e-evidence/replit-deploy/2026-11-05T21-38-27Z` onward).

### Coverage (613 admin + member inventory rows)

Every row has a C22 verdict line in the lane files `reports/prod-audit-2026-10-29/cycle-22/c22-{admin-content,admin-shell,admin-ops,member}.md` (local audit workspace, not committed, like cycles 17 and 21). Width cells were then completed by lanes p1–p8 (`cycle-22/p{1..8}-*.md`, every row stamped `8a45cbe2` from p4 on). Recount combining every per-width line across all twelve lane files (`e2e-evidence/c22/lead/final-recount-8a45cbe2.txt`): PASS 495 · PARTIAL 10 · UNVERIFIED 102 · OWNER-BLOCKED 3 · FAIL→FIXED-VERIFIED 2 · n/a 1 · open FAIL 0. PASS means every width cell passed on some line. The first close-out tally (PASS 247 · PARTIAL 255) counted width cells written as a bare "UNVERIFIED" as results; 366 rows needed those cells driven, and they were.

PARTIAL (10), with reasons: SC-14 / SSC-15 duplicate-slug state at 390; RS-51, GH-15, EX-08, AU-17 need job or run states that don't exist on prod; LH-32 real touch and reduced motion; C6-MB-007 / C6-MB-040 recommendations Refresh is a paid run; C6-MB-057 needs a real emailed unsubscribe token. Public routes were smoke-checked on cc0769a5 by the lead: 18 routes 200, 404, auth redirects, admin APIs 401, no console errors or failed requests at 1440/390. The 47 public findings stand from C20 (47/47).

### Why rows are UNVERIFIED
- Mocked empty server responses (`agent-browser network route --body` not honoured): 17 admin rows.
- Paid or external writes: enrichment, researcher launch, recommendations refresh, GitHub sync, link-health scan/apply.
- Destructive or real-data writes: reseed, DB restore, user role/delete, RM-38/RM-74 on real resources (OWNER-BLOCKED), signing out (revokes every owner session).
- No member account: non-admin sign-in, signed-in non-admin denial, member sign-out. Sign-up owner-skipped.
- Tooling: no real touch, reduced-motion emulation, request delay primitive, or screen reader.
- Server failure paths that need a real conflict: bulk approve/reject 409.

### Notes (not defects)
Concatenated-URL edit (valid WHATWG URL), sub-subcategory slug uniqueness per level, signed-out /admin redirects instead of a gate button, dialog Retry focus lands on the dialog, research config-load error has no Retry, GitHub heading on config failure, Link Health remediation table unpaginated (259 rows), whole Export tab `aria-busy` for ≤10 s during a link-check retry. From the width lanes: Users Retry that fails again hands focus to the search box (deliberate, `UsersTab.tsx:117`); Link Health Retry shows focus on body for ~0.3 s before it settles on Retry; Researcher launch marks only the first invalid field (`ResearchLaunchGuide.tsx:199`); a dialog reopened from cache keeps its last good data until a refetch fails; icon-only GitHub "Reset to configured repository" at touch widths is named by its title.

### Test data
Every C22 write is in `reports/prod-audit-2026-10-29/cycle-22/qa-ledger.md` and closed. Lead read-back at close-out: 0 `[AUDIT] C22` resources (public search 0; 190925–190935 all 404), 0 audit taxonomy items, pendingApprovals 21 (all real), pendingEdits 0, owner collections [], no active API keys, 12 bookmarks, favorites [185551, 186357], name "Admin User", onboarding completed/step 5 with original values, notification prefs original values. Irreversible side effects: preference `updatedAt` / revision counters (160 → 168) and `inAppOptedInAt` timestamps changed; values are identical. Three append-only audit-log rows (`users.exported` #29652–#29654) from Users Export CSV presses. Journey progress `lastAccessedAt` may have moved on one Resume click.

Slips on real data, both reverted within minutes and read back: QA subcategory 2362 briefly created under a real category (C22-QA-2362); a stray Enter swapped steps 1 and 2 of journey 8 for about a minute (C22-QA-J8). Lead read-back after the width lanes (`8a45cbe2`): 0 `[AUDIT]` resources or taxonomy items (QA 190936–190941 all 404), 9 categories, pendingApprovals 21 / pendingEdits 0, collections [], 0 active API keys, 12 bookmarks (all saved, unarchived, no notes, no collection), favorites [185551, 186357], recommendation feedback [], name "Admin User", preferences and onboarding original, notification prefs original, journey 8 steps in original order.

### Owner follow-ups
Create a non-admin audit member account (or allow sign-up) to verify member sign-in, sign-out and non-admin denial. Move the workspace `.env` / `.env.local` values (public VITE_* config and dev host flags, no credentials) to Replit Secrets. Earlier open owner decisions (PC-12, DATA-TAXO-LABEL, DATA-DUP-TITLE, DATA-ENTITY-DESC, EN-17-COPY) are unchanged.
