# awesome.video coverage inventory

Denominator: reports/prod-audit-2026-10-26/INVENTORY.md (760 interactions, each with surface, trigger and API dependency), every row x {1440x900, 820x1180, 390x844}.

| Lane | Rows | Scope | Results |
|---|---|---|---|
| public-core | 66 + 1 | shell, nav, search, category/tag/resource pages, bookmarks (guest), new researcher resource | reports/prod-audit-2026-10-29/cycle-17/c17-pc.md |
| public-secondary | 63 | about/docs/submit form, journeys, advanced pages, 404, meta | cycle-17/c17-ps.md |
| a11y + signed-in shell | 19 + 44 | keyboard, focus, landmarks; admin shell entry points | cycle-17/c17-ax-sh.md |
| admin-content | 239 | overview, approvals, edits, resource manager, categories/subcategories, journeys | cycle-17/c17-admin-content.md |
| admin-ops | 132 | export, link health, users, database, diagnostics, audit log | cycle-17/c17-admin-ops.md |
| admin-ai | 116 | enrichment, GitHub sync (dry run), researcher, recommendations | cycle-17/c17-admin-ai.md |
| auth (added for this brief) | 8 | sign-in/up validation, admin denial UI+API signed out, guest member pages | cycle-17/c17-auth.md |
| member | 81 + auth flows | sign-up, sign-in, persistence, profile, bookmarks, submit, notifications, member sign-out | cycle-17/c17-member.md (owner-approved audit account) |

Expected result per row is the inventory's Interaction column plus cycle-17/RULES.md acceptance rules.

## C21 (2026-11-05) coverage plan

Same denominator (760 inventory rows x 1440/820/390) plus the 47 black-box findings and the C21 ledger rows (docs/audit/BUG_LEDGER.md "C21 ledger"). Every earlier PASS predates C18/C19/C20 code, so every row is re-driven on the current live revision. Lane files: reports/prod-audit-2026-10-29/cycle-21/<lane>.md; rules: cycle-21/RULES.md.

| Lane | Rows | Scope | Status |
|---|---|---|---|
| baseline-a | 8 findings + GAP-PRIV-REVOKE | consent, a11y names, sidebar, header | running (rev b3c25369), e2e-evidence/c20/baseline/ |
| baseline-b | 18 findings | listings, tags, counters, titles, pagination, palette | running |
| baseline-c | 21 findings | cards, resource pages, outbound links, catalog data | running |
| member + auth | C6-MB-*, auth rows (sign up incl. validation and duplicate email, sign in incl. bad credentials, persistence, sign out, profile, submit, bookmarks/favorites) | queued; sign-up needs the audit Gmail inbox |
| admin | SH, OV, AP, ED, RM, CAT, SSC, JN, US, AU, EX, LH, DB, DG, SC, EN, GH, RS, RW + non-admin denial (UI and API) | queued; BLOCKED until the owner session cookie exists |
| public inventory regression | C6-PC, C6-PS, C6-AX | queued |

## Owner decisions (C21)
- 2026-11-05 sign-up coverage skipped by owner. Rows: sign up, sign-up validation errors, duplicate email, email verification → OWNER-SKIPPED (never driven; not counted as PASS).

## C22 (2026-11-05) result

Admin + member inventory (613 rows) re-driven on post-C17 code across revisions cc0769a5 → 721f528c. Lane files (local audit workspace, not committed): `reports/prod-audit-2026-10-29/cycle-22/c22-admin-content.md` (SH*, OV, AP, ED, RM, CAT, SC, SSC), `c22-admin-shell.md` (SH, OV, taxonomy states), `c22-admin-ops.md` (LH incl. new LH-REM-01..07 remediation-panel rows, EX, JN, US, AU, DB, DG, EN, GH, RS, RW), `c22-member.md` (C6-MB, C6-PC-007, sign-in validation, signed-out denial). Every row has a verdict; tally and reasons in docs/audit/VERDICT.md (C22). Rules: cycle-22/RULES.md. QA ledger: cycle-22/qa-ledger.md (all closed). Width cells completed by lanes p1–p8 (`cycle-22/p{1..8}-*.md`) on `8a45cbe2`; final recount 613 = PASS 495 · PARTIAL 10 · UNVERIFIED 102 · OWNER-BLOCKED 3 · FAIL→FIXED-VERIFIED 2 · n/a 1 (`e2e-evidence/c22/lead/final-recount-8a45cbe2.txt`).
