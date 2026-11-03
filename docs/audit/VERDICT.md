# awesome.video audit verdict (2026-11-03)

**Verdict: PASS WITH OPEN ITEMS.** No known code defect is open on production. Every bug found in this run is fixed, deployed with replit-deploy and re-measured on the live site. Not every inventory row has been driven at every width, and three content decisions belong to the owner, so this is not a clean full-coverage PASS.

Final production revision: `93373522` (`/api/version`, health ready 200), equal to `origin/main`.

## Bugs fixed and verified on production this session

| ID | Defect | PR | Live revision | Prod evidence |
|---|---|---|---|---|
| CAT-02/SSC-02/JN-02/AU-20 (+5 surfaces) | Admin load-error Retry dropped keyboard focus to `<body>` | #198 | d74699a3 | Retry -> H1 on 9 surfaces x 3 widths (27/27) |
| C6-MB-042 (+ Recently-opened sibling) | 32px links at touch widths | #199 | 54b90e36 | 258x44 @390, 660x44 @820, 32px @1440 by design |
| C6-PC-030 | Home tag popover clipped off the top at 390 | #200 | 87b8ece7 | popover 0..406 @390, Clear all on-screen |
| C6-MB-011 | Clerk account modal 880px wide, cut off below ~920px | #201 | 93373522 | 16..374 @390, 16..804 @820 |
| C6-PC-038 | Taxonomy breadcrumb/sibling links dropped `?kind=` | #201 | 93373522 | all hrefs keep `?kind=tools` |

Earlier in the same run (before this session's resume): SH-09, ED-13, PC-014/025, PC-046-DISMISS, PC-046-SORT, RS-43, all fixed-verified on prod (see PROGRESS.md).

## Bug ledger (449 rows, BUG_LEDGER.md)

| Current status | Rows |
|---|---|
| fixed-verified on prod | 318 |
| partial (some widths or states not driven) | 45 |
| unverified (reason per row) | 62 |
| withdrawn (by design or tool artefact) | 21 |
| owner decision | 3 |
| still failing | 0 |

The 383 inherited "re-check on prod" rows were each re-checked against production and given one of the statuses above.

## What was not verified, and why

- **Partial/unverified rows (107)** need one of: a real touch device or screen reader, request-failure injection (the browser tools can't abort requests reliably), a paid or live-write action (enrichment run, GitHub sync, researcher run), data that doesn't exist today (empty discovery queue, no degraded-enrichment log row), or a theme the run rules forbid changing. Each row names its reason.
- **Test suite:** the repo has none (removed in b4040bfe by owner rule). Gates run instead: `tsc` 0 and `npm run build` 0 on every merged commit. Whole-repo `eslint .` fails on ~4.4k pre-existing type-strictness errors (logged as a follow-up, not touched).

## Owner decisions open

1. **PC-12:** resource 190151 "MirrorFly IM Software" is off-topic and has the tag typo "enteprise". Unpublish, fix the tag, or keep it.
2. **DATA-TAXO-LABEL / AI-16:** some subcategory names lost punctuation at import ("RTMPRTSPHTTP Protocol Servers", "Next-Generation Codecs AV1 VVC"). Renaming live taxonomy is your call.
3. **EN-17-COPY:** enrichment has no small run; the full run is ~$21 for 3,012 resources.

## Test data

Deleted at close-out (14:40Z): QA submission 190920 and audit member `krzemienski+audit202611031301@gmail.com` (with its journey progress, revoked API keys and settings). Earlier fixtures were deleted as they were finished. QA ledger: 0 open. One side effect stays: audit-log row TX#29386 (a `database.exported` entry from a read-only leak check).
