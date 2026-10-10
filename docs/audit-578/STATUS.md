# Audit 578 — item status (112 items)

Updated 2026-10-10 20:45 UTC by task 592. Every row links to its evidence file, which records the run steps, response excerpts, screenshots and residue check.

Counts: A 6, B 9, C 5, D 12, E 6, F 13, G 7, H 10, I 6, J 15, V 23 = **112**.

Production serves `572e6739` (2026-10-09). HEAD is 17+ commits ahead, so every DEV-proven fix except V23's needs a republish to go live. V23's fix was already in that revision and is proven on production.

| item | status | title | evidence |
|---|---|---|---|
| A01 | PASS | Public resource metadata exposes agent, cost, email, IP and internal notes | [verify/A01.md](verify/A01.md) |
| A02 | PASS | Bookmarks and favorites disclose other contributors' non-public resources | [verify/A02.md](verify/A02.md) |
| A03 | PASS | Bookmark notes accept objects instead of the UI's bounded text contract | [verify/A03.md](verify/A03.md) |
| A04 | PASS | Public developer endpoints ignore API keys and advertised premium/standard limits | [verify/A04.md](verify/A04.md) |
| A05 | PASS | Public developer tag API is empty although the catalog has 1,535 tags | [verify/A05.md](verify/A05.md) |
| A06 | PASS | OpenAPI omits resource/search filter parameters and advertises unrelated generic ones | [verify/A06.md](verify/A06.md) |
| B01 | PASS | Unpublished journeys leaked to anonymous visitors | [verify/B01.md](verify/B01.md) |
| B02 | PASS | Published journeys exposed rejected resources | [verify/B02.md](verify/B02.md) |
| B03 | PASS | Progress accepted partially invalid step arrays | [verify/B03.md](verify/B03.md) |
| B04 | PASS | Rapid clicks across steps overwrote queued completions | [verify/B04.md](verify/B04.md) |
| B05 | PASS | Deleting a logical step could fail halfway | [verify/B05.md](verify/B05.md) |
| B06 | PASS | Missing resource ids reached the database and returned 500 | [verify/B06.md](verify/B06.md) |
| B07 | PASS | Step and picker load failures shown as empty data | [verify/B07.md](verify/B07.md) |
| B08 | PASS | Step editor reset typed changes while saving | [verify/B08.md](verify/B08.md) |
| B09 | PASS | Repeated recommendation query parameters returned 500 | [verify/B09.md](verify/B09.md) |
| C01 | PASS | Edit-review diff must equal the data approval applies | [verify/C01.md](verify/C01.md) |
| C02 | PASS | Submitters can no longer forge AI confidence or analysis timestamps | [verify/C02.md](verify/C02.md) |
| C03 | PASS | Ordinary users' edit submissions trigger zero paid AI calls | [verify/C03.md](verify/C03.md) |
| C04 | PASS | Malformed edit shapes return 400, never 500; no-op edits are refused | [verify/C04.md](verify/C04.md) |
| C05 | PASS | Duplicate suggested URLs are rejected with an actionable 409 (submission, approval, race) | [verify/C05.md](verify/C05.md) |
| D01 | PASS | Renaming or moving taxonomy nodes leaves resource labels orphaned (VERIFIED) | [verify/D01.md](verify/D01.md) |
| D02 | PASS | Duplicate taxonomy names/slugs surfaced as opaque 500s (VERIFIED) | [verify/D02.md](verify/D02.md) |
| D03 | PASS | Leaf renames bypassed the duplicate-name rule (VERIFIED) | [verify/D03.md](verify/D03.md) |
| D04 | PASS | Admin PATCH accepted null parents and created detached nodes (VERIFIED) | [verify/D04.md](verify/D04.md) |
| D05 | PASS | Same-name subcategories under different parents showed each other's counts (VERIFIED) | [verify/D05.md](verify/D05.md) |
| D06 | PASS | Approvals and edit approvals left cached admin tables and public taxonomy stale (VERIFIED) | [verify/D06.md](verify/D06.md) |
| D07 | PASS | Admin resource metadata stored raw HTML tags (VERIFIED) | [verify/D07.md](verify/D07.md) |
| D08 | PASS | Bulk admin handlers accepted invalid IDs and reported false success (VERIFIED) | [verify/D08.md](verify/D08.md) |
| D09 | PASS | A failed resource delete destroyed edit suggestions and wrote a false deletion audit row (VERIFIED) | [verify/D09.md](verify/D09.md) |
| D10 | PASS | Editor status changes bypassed transition timestamps and attribution (VERIFIED) | [verify/D10.md](verify/D10.md) |
| D11 | PASS | Non-string rejection reasons crashed resource and edit moderation (VERIFIED) | [verify/D11.md](verify/D11.md) |
| D12 | PASS | Bulk approval and admin publishing bypassed the description gate (VERIFIED) | [verify/D12.md](verify/D12.md) |
| E01 | PASS | A deleted Clerk account could be re-created by its still-valid session | [verify/E01.md](verify/E01.md) |
| E02 | PASS | User management and journey edits were missing from the server audit trail | [verify/E02.md](verify/E02.md) |
| E03 | PASS | Signing back in lost the hash-routed admin tab | [verify/E03.md](verify/E03.md) |
| E04 | PASS | Overview's pending-approval tile could stay stale | [verify/E04.md](verify/E04.md) |
| E05 | PASS | Digest queue health stayed stale after the first load | [verify/E05.md](verify/E05.md) |
| E06 | PASS | API key management had no user interface | [verify/E06.md](verify/E06.md) |
| F01 | PASS | Clear & Re-seed is atomic (source failure or mid-run failure leaves catalog and edits intact) | [verify/F01.md](verify/F01.md) |
| F02 | PASS | Partial seeding shows counts and the failed items | [verify/F02.md](verify/F02.md) |
| F03 | PASS | JSON export is labelled a non-restorable catalog snapshot and lists what it omits | [verify/F03.md](verify/F03.md) |
| F04 | PASS | Dead SQL-dump and API-token controls removed | [verify/F04.md](verify/F04.md) |
| F05 | PASS | CSV and OPML exports appear in Export history | [verify/F05.md](verify/F05.md) |
| F06 | PASS | Tag canonicalization refreshes public catalog caches immediately | [verify/F06.md](verify/F06.md) |
| F07 | PASS | Only one link-health scan can be active | [verify/F07.md](verify/F07.md) |
| F08 | PASS | Link-health read failures are shown as errors with Retry, never as empty data | [verify/F08.md](verify/F08.md) |
| F09 | PASS | A failed link-health job shows its reason | [verify/F09.md](verify/F09.md) |
| F10 | PASS | Admins can cancel a running link-health scan | [verify/F10.md](verify/F10.md) |
| F11 | PASS | Export "Run Link Check" is a persistent link-health job with progress, cancel and restart-interrupted state | [verify/F11.md](verify/F11.md) |
| F12 | PASS | GitHub panel updates automatically after Pull / Sync now | [verify/F12.md](verify/F12.md) |
| F13 | PASS | Partial GitHub imports show Partial, exact counts and every failure (queued and direct) | [verify/F13.md](verify/F13.md) |
| G01 | PASS | Discovery moderation is atomic and idempotent | [verify/G01.md](verify/G01.md) |
| G02 | PASS | Research approval could publish a resource without recording the approved discovery (VERIFIED) | [verify/G02.md](verify/G02.md) |
| G03 | PASS | Researcher approvals bypassed approval provenance and audit logging (VERIFIED) | [verify/G03.md](verify/G03.md) |
| G04 | PASS | Cancellation is truthful and never rewrites history | [verify/G04.md](verify/G04.md) |
| G05 | PASS | Researcher cancel failures are visible and retryable | [verify/G05.md](verify/G05.md) |
| G06 | PASS | Research workspace is honestly read-only, refreshes live, and hands off to review | [verify/G06.md](verify/G06.md) |
| G07 | PASS | Scraper refuses private destinations on every hop and image | [verify/G07.md](verify/G07.md) |
| H01 | PASS | Explorer tag filters disappear despite 1,047 tagged resources | [verify/H01.md](verify/H01.md) |
| H02 | PASS | Search HTML ignores filters, sorting, filter-only browsing and the legacy `search` query | [verify/H02.md](verify/H02.md) |
| H03 | PASS | Filtered taxonomy links serve unfiltered server cards and totals | [verify/H03.md](verify/H03.md) |
| H04 | PASS | Encoded taxonomy URLs become self-canonical escaped duplicates | [verify/H04.md](verify/H04.md) |
| H05 | PASS | Compatibility redirects discard pagination and active discovery filters | [verify/H05.md](verify/H05.md) |
| H06 | PASS | Resource API failures presented as removed resources or empty related results | [verify/H06.md](verify/H06.md) |
| H07 | PASS | Guest bookmark and missing-detail titles change between crawl and client passes | [verify/H07.md](verify/H07.md) |
| H08 | PASS | Missing resource pages bypass dead-link telemetry | [verify/H08.md](verify/H08.md) |
| H09 | PASS | Theme account-sync failures are silently swallowed | [verify/H09.md](verify/H09.md) |
| H10 | PASS | Resource detail category chip always shows the protocols glyph ⟁ | [verify/H10.md](verify/H10.md) |
| I01 | PASS | Violet accent text fails AA on raised surfaces; Magenta on Geist/Brutalist surface-3 | [verify/I01.md](verify/I01.md) |
| I02 | PASS | Violet primary-button labels fail AA in Editorial, Geist and Swiss | [verify/I02.md](verify/I02.md) |
| I03 | PASS | Artifact docs advertised obsolete ink values and incorrect contrast ratios | [verify/I03.md](verify/I03.md) |
| I04 | PASS | Anatomy preview is routeable but its inventory said it was not | [verify/I04.md](verify/I04.md) |
| I05 | PARTIAL — 54/96 alternate-system pairs; remainder owned by in-progress task #611 | The four alternate systems against the frozen reference (pixel proof) | [verify/I05.md](verify/I05.md) |
| I06 | PASS (reduced matrix; 7 cells UNVERIFIED, listed in file) | Blocked and token-only screens: per-screen, per-system design evidence | [verify/I06.md](verify/I06.md) |
| J01 | PASS | Legacy-auth unit assertion requires removed remount-prone Route syntax | [verify/J01.md](verify/J01.md) |
| J02 | PASS | Four sidebar source tests enforce obsolete pre-V2 markup and breakpoints | [verify/J02.md](verify/J02.md) |
| J03 | PASS | Integration DB omits migration journal required by admin statistics | [verify/J03.md](verify/J03.md) |
| J04 | PASS | Global typed ESLint scans evidence and cannot parse supported tooling | [verify/J04.md](verify/J04.md) |
| J05 | PASS | Application lint gate: correctness errors fixed, ratchet locked in | [verify/J05.md](verify/J05.md) |
| J06 | PASS | Root-script drift rejects two unregistered design-run launchers | [verify/J06.md](verify/J06.md) |
| J07 | PASS | Malformed system selectors can evade skin validator | [verify/J07.md](verify/J07.md) |
| J08 | PASS | Hosted font fetch validation exists but is not automatic release gate | [verify/J08.md](verify/J08.md) |
| J09 | PASS | Protected-route return coverage relies on manual subset | [verify/J09.md](verify/J09.md) |
| J10 | PASS | Duplicate font IDs silently overwrite registry validation | [verify/J10.md](verify/J10.md) |
| J11 | PASS | Script inventory misses extensionless scripts entries and cannot expire runbook reasons | [verify/J11.md](verify/J11.md) |
| J12 | PASS | Evidence-only artifact exclusion survives later runnable source | [verify/J12.md](verify/J12.md) |
| J13 | PASS | Validator checks wrapped resource but not recommendation fields | [verify/J13.md](verify/J13.md) |
| J14 | PASS | Preview dependency tree lacks automatic vulnerability coverage | [verify/J14.md](verify/J14.md) |
| J15 | PASS | Live tag check has fixed vocabulary and sparse failure diagnostics | [verify/J15.md](verify/J15.md) |
| V01 | PASS | Signed-in theme preference persistence | [verify/V01.md](verify/V01.md) |
| V02 | PASS | Guest bookmark merge on real sign-in | [verify/V02.md](verify/V02.md) |
| V03 | PASS | Public collection rendering and privacy round trip | [verify/V03.md](verify/V03.md) |
| V04 | PASS | Submit success state and own-contribution UI round trip | [verify/V04.md](verify/V04.md) |
| V05 | PASS | Start / Resume / complete / Undo a journey in the UI | [verify/V05.md](verify/V05.md) |
| V06 | PASS | Recommendations: refresh, feedback, Undo/Restore and recovery across every panel | [verify/V06.md](verify/V06.md) |
| V07 | PASS | Onboarding invitation dismissal and wizard persistence | [verify/V07.md](verify/V07.md) |
| V08 | PASS | Profile deletion entry links, create/withdraw dialogs, sign-out and sign-out-everywhere | [verify/V08.md](verify/V08.md) |
| V09 | PASS | Reminder/digest settings, quick actions, and learning-preference reset | [verify/V09.md](verify/V09.md) |
| V10 | PASS | Suggest an edit: validation, submit, View status, withdraw, admin Analyze/Apply and approval | [verify/V10.md](verify/V10.md) |
| V11 | PASS | Email unsubscribe confirmation form + real digest cycle | [verify/V11.md](verify/V11.md) |
| V12 | PASS | /admin/users role change, user deletion, and two-user isolation | [verify/V12.md](verify/V12.md) |
| V13 | PASS | Admin journey step editor: add, error, edit, reorder, remove resource, delete group | [verify/V13.md](verify/V13.md) |
| V14 | PASS | Paid enrichment, live events, cancellation and restart recovery | [verify/V14.md](verify/V14.md) |
| V15 | PASS | Research launch, scoped bulk approval, cancel and restart | [verify/V15.md](verify/V15.md) |
| V16 | PASS | Seed, typed RESEED, rollback/refusal and global maintenance (isolated DB) | [verify/V16.md](verify/V16.md) |
| V17 | PASS | GitHub configure / Pull / repeat Pull / direct import / process-queue / partial / Sync now / bad credentials / mid-job restart | [verify/V17.md](verify/V17.md) |
| V18 | PASS | Whole-catalog link checking and populated scan-result controls | [verify/V18.md](verify/V18.md) |
| V19 | PASS | Empty taxonomy, absent-tag, high-page-count and featured/deep/tagged states | [verify/V19.md](verify/V19.md) |
| V20 | PASS | Cold signed-out catalog/nav load against a real 503, keyboard Retry, recovery | [verify/V20.md](verify/V20.md) |
| V21 | PASS | Guest /api/submit forced through the live 429 backstop | [verify/V21.md](verify/V21.md) |
| V22 | PASS | Publish-time enforcement: the deploy build gate blocks bad releases | [verify/V22.md](verify/V22.md) |
| V23 | PASS | Production re-verify: palette caption contrast (BL-001) and Explorer long name (BL-004) | [verify/V23.md](verify/V23.md) |

## Final gate run (task 592, 2026-10-10 20:02–20:45 UTC, tree = HEAD 8a7ea761 + task-592 changes)

Logs: `verify/task592-harness/out/gates/` (`results.tsv` holds name, rc, duration and time).

| gate | result |
|---|---|
| typecheck (`npm run check`), task302-build, migration-drift, task302-boot-safety, openapi-drift, response-contract-drift, palette-drift, standalone-palette-drift, dead-components, accent-drift, dead-exports, root-script-drift, theme-registry-types, canonical-token-parity, admin-catalog-kind-mappings, webfont-fetch, artifact-deps, prefs-revision-races, search-typos, taxonomy-listing-parity, pool-probe | PASS |
| lint-ratchet | PASS after fixing 6 new findings this task introduced. The baseline shrank 6382 → 6381. |
| unit (`vitest run tests/unit`) | PASS 343/343 |
| print-audit, responsive-audit, tablet-audit, tag-route-audit, collections-audit, task302-resilience, seo-snapshot `--gate --parity`, taxonomy-no-corpus-fetch, ds-showcase, ds-button-sweep, sticky-preview-audit, guest-recommendations, product-profile-browser, font-prepaint, cache-headers `--spawn --build` | PASS |
| url-params-audit | First run: FAIL 1/35, a stale fixture. `a < b > c` has no token of 2+ characters, so the search page correctly shows its "Keep typing" prompt; this has been true since 10-06. The fixture is now `ffmpeg < x264 > av1`, which keeps the scrubber false-positive check intact. Rerun: PASS 35/35. |
| auth-return-audit | **EXCEPTION (needs owner decision).** 31/32 and 38/39. Clerk now sends the audit's repeated password sign-ins to `/sign-in/client-trust`, its new-device verification step, so one deep-return case can't finish. App routing for every case that signs in is PASS. Fix options: turn off Client Trust on the DEV Clerk instance, or move the audit to backend-minted sessions. Teardown left 0 QA users. |
| integration (`--no-file-parallelism`) | 234/235. The one failure is `resource-kinds.test.ts › journey step resources and anonymous recommendations`, a field-set mismatch that predates this task (it is the subject of the separate journey-step resource-shape item). |
| publish gate (`pre-publish-gate.sh --publish`, offline copy) | PASS after the bundle-budget fix. See V22. |
| awesome-ds-verify `--mode full --deep` | **Not run.** The owner asked to wrap up before the tens-of-minutes deep sweep. Every DS gate it wraps that can run on its own (palette, standalone-palette, accent, canonical-token, font-prepaint, ds-showcase, ds-button-sweep, product-profile, theme-registry) passed above. This task changed no tokens, CSS or skins; its client edits are behaviour and copy fixes in existing DS components. |

## Residue
DEV: `__qa_test_plan_%` / `__qa_test_plan_592_%` rows = 0 in every table, and Clerk users with that prefix = 0. Scratch DBs `awesome_scratch_592*` were dropped. Two older `__qa_test_parity_*` users from 2026-10-09 parity runs (another task) remain.
