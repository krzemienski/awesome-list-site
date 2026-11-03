# awesome.video audit verdict (2026-11-03, close-out)

**Verdict: PASS WITH OPEN ITEMS.** Every bug this run found is fixed, deployed with replit-deploy and re-measured on the live site. No ledger row is still failing. Some inventory rows still lack one state or width, and four content questions belong to the owner, so this is not a clean full-coverage PASS.

Production at close-out: `cf3a8403` (#207, live 16:51:33Z) (`/api/version`, `/api/health/ready` 200), equal to `origin/main`.

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

Owner decisions:
1. BUG-003. Mixpanel now sends after an explicit "Allow analytics" even when the browser sets Do Not Track (`ignore_dnt`), the same as PostHog and Amplitude. The Privacy Policy does not mention DNT.
2. Follow-up (not one of the 47). On a throttled first load, text typed into the hero search box before hydration is cleared by hydration.
