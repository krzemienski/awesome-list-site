# Independent visual parity report

Run: `2026-09-10T06-51-25-272Z-10881`  
Claim: **full-inventory-baseline**  
Gate: **NOT PASSED**  
Measured: 0 pass / 29 fail / 29 denominator rows. Missing counterparts, aliases, and blocked rows are excluded from the denominator but keep the gate unpassed. Inputs changed during run: no.

## Executed coverage

Executed 29 full expected/actual comparisons across 8 concrete screen/state identities. 60 rows are blocked, 92 are unverified, 100 lack a routeable counterpart, and 4 are aliases. Every configured inventory row has one terminal result.

18 comparisons required bounded repeat settling after the first raw frame. All admitted comparison images use two consecutive byte-identical raw frames; every attempt remains retained alongside the selected pair. The prior 68-pixel mobile difference reproduced exactly on reference attempt 1 versus attempt 2 at x=41–333, y=119–490, but Pixelmatch classified all 68 as antialiasing and attempts 2–3 were byte-identical. Nothing was masked and the threshold remained 0.1/0.5%.

## Actionable implementation findings

- Home Index, category, subcategory, resource detail, about, palette, mobile drawer, and the registered artifact all fail the fixed 0.5% ceiling; use the per-row dimensions and diff images below.
- The production app is missing the native Fraunces italic face. It is recorded as a visual defect, not mislabeled as a failed capture.
- The reference shell's demonstrator admin identity is not aligned to the real visitor role. The real signed-out state is retained; no auth bypass or fake identity is used.
- The registered artifact has no independently routeable anatomy/docs chapter surfaces. Those rows remain `MISSING_COUNTERPART` build work rather than duplicate screenshots of `/`.
- Production-only admin sub-subcategories, journeys, and digests have no genuine active-source counterpart and are token-only; authorized admin rows remain explicit blockers without fabricated data.

| Screen/state | Width | Diff pixels | Diff % | Status | Evidence / reason |
|---|---:|---:|---:|---|---|
| app.about | 375 | 2227773 | 76.0754% | FAIL | [Actual](baseline/2026-09-10T06-51-25-272Z-10881/actual/app.about-375.png) · [Expected](baseline/2026-09-10T06-51-25-272Z-10881/expected/app.about-375.png) · [Diff](baseline/2026-09-10T06-51-25-272Z-10881/diff/app.about-375.png) |
| app.about | 768 | 2627104 | 72.1364% | FAIL | [Actual](baseline/2026-09-10T06-51-25-272Z-10881/actual/app.about-768.png) · [Expected](baseline/2026-09-10T06-51-25-272Z-10881/expected/app.about-768.png) · [Diff](baseline/2026-09-10T06-51-25-272Z-10881/diff/app.about-768.png) |
| app.about | 1024 | 3453742 | 76.8641% | FAIL | [Actual](baseline/2026-09-10T06-51-25-272Z-10881/actual/app.about-1024.png) · [Expected](baseline/2026-09-10T06-51-25-272Z-10881/expected/app.about-1024.png) · [Diff](baseline/2026-09-10T06-51-25-272Z-10881/diff/app.about-1024.png) |
| app.about | 1440 | 4440241 | 74.9332% | FAIL | [Actual](baseline/2026-09-10T06-51-25-272Z-10881/actual/app.about-1440.png) · [Expected](baseline/2026-09-10T06-51-25-272Z-10881/expected/app.about-1440.png) · [Diff](baseline/2026-09-10T06-51-25-272Z-10881/diff/app.about-1440.png) |
| app.admin.approvals | 375 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.approvals | 768 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.approvals | 1024 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.approvals | 1440 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.audit | 375 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.audit | 768 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.audit | 1024 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.audit | 1440 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.categories | 375 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.categories | 768 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.categories | 1024 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.categories | 1440 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.database | 375 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.database | 768 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.database | 1024 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.database | 1440 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.digests | 375 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.admin.digests | 768 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.admin.digests | 1024 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.admin.digests | 1440 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.admin.edits | 375 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.edits | 768 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.edits | 1024 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.edits | 1440 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.enrichment | 375 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.enrichment | 768 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.enrichment | 1024 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.enrichment | 1440 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.export | 375 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.export | 768 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.export | 1024 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.export | 1440 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.github | 375 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.github | 768 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.github | 1024 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.github | 1440 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.journeys | 375 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.admin.journeys | 768 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.admin.journeys | 1024 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.admin.journeys | 1440 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.admin.linkhealth | 375 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.linkhealth | 768 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.linkhealth | 1024 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.linkhealth | 1440 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.overview | 375 | — | — | BLOCKED | Admin requires a real authorized session, and reference admin statistics are demonstrator data rather than an approved real-data adapter. |
| app.admin.overview | 768 | — | — | BLOCKED | Admin requires a real authorized session, and reference admin statistics are demonstrator data rather than an approved real-data adapter. |
| app.admin.overview | 1024 | — | — | BLOCKED | Admin requires a real authorized session, and reference admin statistics are demonstrator data rather than an approved real-data adapter. |
| app.admin.overview | 1440 | — | — | BLOCKED | Admin requires a real authorized session, and reference admin statistics are demonstrator data rather than an approved real-data adapter. |
| app.admin.researcher | 375 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.researcher | 768 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.researcher | 1024 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.researcher | 1440 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.resources | 375 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.resources | 768 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.resources | 1024 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.resources | 1440 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.subcategories | 375 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.subcategories | 768 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.subcategories | 1024 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.subcategories | 1440 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.subsubcategories | 375 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.admin.subsubcategories | 768 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.admin.subsubcategories | 1024 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.admin.subsubcategories | 1440 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.admin.users | 375 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.users | 768 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.users | 1024 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.admin.users | 1440 | — | — | BLOCKED | Real admin authorization is required and no mock reference admin statistics are permitted. |
| app.advanced | 375 | — | — | UNVERIFIED | No independently configured active-reference state yet. |
| app.advanced | 768 | — | — | UNVERIFIED | No independently configured active-reference state yet. |
| app.advanced | 1024 | — | — | UNVERIFIED | No independently configured active-reference state yet. |
| app.advanced | 1440 | — | — | UNVERIFIED | No independently configured active-reference state yet. |
| app.auth.sign-in | 375 | — | — | UNVERIFIED | Real Clerk state is required; no auth fixture is permitted. |
| app.auth.sign-in | 768 | — | — | UNVERIFIED | Real Clerk state is required; no auth fixture is permitted. |
| app.auth.sign-in | 1024 | — | — | UNVERIFIED | Real Clerk state is required; no auth fixture is permitted. |
| app.auth.sign-in | 1440 | — | — | UNVERIFIED | Real Clerk state is required; no auth fixture is permitted. |
| app.auth.sign-up | 375 | — | — | UNVERIFIED | Real Clerk state is required; no auth fixture is permitted. |
| app.auth.sign-up | 768 | — | — | UNVERIFIED | Real Clerk state is required; no auth fixture is permitted. |
| app.auth.sign-up | 1024 | — | — | UNVERIFIED | Real Clerk state is required; no auth fixture is permitted. |
| app.auth.sign-up | 1440 | — | — | UNVERIFIED | Real Clerk state is required; no auth fixture is permitted. |
| app.bookmarks | 375 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.bookmarks | 768 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.bookmarks | 1024 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.bookmarks | 1440 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.categories | 375 | — | — | UNVERIFIED | No independently configured active-reference state yet. |
| app.categories | 768 | — | — | UNVERIFIED | No independently configured active-reference state yet. |
| app.categories | 1024 | — | — | UNVERIFIED | No independently configured active-reference state yet. |
| app.categories | 1440 | — | — | UNVERIFIED | No independently configured active-reference state yet. |
| app.category | 375 | 8619631 | 74.0781% | FAIL | [Actual](baseline/2026-09-10T06-51-25-272Z-10881/actual/app.category-375.png) · [Expected](baseline/2026-09-10T06-51-25-272Z-10881/expected/app.category-375.png) · [Diff](baseline/2026-09-10T06-51-25-272Z-10881/diff/app.category-375.png) |
| app.category | 768 | 7134885 | 57.1881% | FAIL | [Actual](baseline/2026-09-10T06-51-25-272Z-10881/actual/app.category-768.png) · [Expected](baseline/2026-09-10T06-51-25-272Z-10881/expected/app.category-768.png) · [Diff](baseline/2026-09-10T06-51-25-272Z-10881/diff/app.category-768.png) |
| app.category | 1024 | 10000310 | 62.3304% | FAIL | [Actual](baseline/2026-09-10T06-51-25-272Z-10881/actual/app.category-1024.png) · [Expected](baseline/2026-09-10T06-51-25-272Z-10881/expected/app.category-1024.png) · [Diff](baseline/2026-09-10T06-51-25-272Z-10881/diff/app.category-1024.png) |
| app.category | 1440 | 10506551 | 65.8741% | FAIL | [Actual](baseline/2026-09-10T06-51-25-272Z-10881/actual/app.category-1440.png) · [Expected](baseline/2026-09-10T06-51-25-272Z-10881/expected/app.category-1440.png) · [Diff](baseline/2026-09-10T06-51-25-272Z-10881/diff/app.category-1440.png) |
| app.collection | 375 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.collection | 768 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.collection | 1024 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.collection | 1440 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.contributions | 375 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.contributions | 768 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.contributions | 1024 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.contributions | 1440 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.design-system | 375 | — | — | UNVERIFIED | Application showcase is distinct from the registered artifact baseline. |
| app.design-system | 768 | — | — | UNVERIFIED | Application showcase is distinct from the registered artifact baseline. |
| app.design-system | 1024 | — | — | UNVERIFIED | Application showcase is distinct from the registered artifact baseline. |
| app.design-system | 1440 | — | — | UNVERIFIED | Application showcase is distinct from the registered artifact baseline. |
| app.error.empty | 375 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.error.empty | 768 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.error.empty | 1024 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.error.empty | 1440 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.error.loading | 375 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.error.loading | 768 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.error.loading | 1024 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.error.loading | 1440 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.error.route | 375 | — | — | UNVERIFIED | Error injection is prohibited; no naturally occurring real error state supplied. |
| app.error.route | 768 | — | — | UNVERIFIED | Error injection is prohibited; no naturally occurring real error state supplied. |
| app.error.route | 1024 | — | — | UNVERIFIED | Error injection is prohibited; no naturally occurring real error state supplied. |
| app.error.route | 1440 | — | — | UNVERIFIED | Error injection is prohibited; no naturally occurring real error state supplied. |
| app.home.index | 375 | 1077031 | 52.6698% | FAIL | [Actual](baseline/2026-09-10T06-51-25-272Z-10881/actual/app.home.index-375.png) · [Expected](baseline/2026-09-10T06-51-25-272Z-10881/expected/app.home.index-375.png) · [Diff](baseline/2026-09-10T06-51-25-272Z-10881/diff/app.home.index-375.png) |
| app.home.index | 768 | 1554368 | 52.7611% | FAIL | [Actual](baseline/2026-09-10T06-51-25-272Z-10881/actual/app.home.index-768.png) · [Expected](baseline/2026-09-10T06-51-25-272Z-10881/expected/app.home.index-768.png) · [Diff](baseline/2026-09-10T06-51-25-272Z-10881/diff/app.home.index-768.png) |
| app.home.index | 1024 | 2173727 | 60.1525% | FAIL | [Actual](baseline/2026-09-10T06-51-25-272Z-10881/actual/app.home.index-1024.png) · [Expected](baseline/2026-09-10T06-51-25-272Z-10881/expected/app.home.index-1024.png) · [Diff](baseline/2026-09-10T06-51-25-272Z-10881/diff/app.home.index-1024.png) |
| app.home.index | 1440 | 2428311 | 56.6642% | FAIL | [Actual](baseline/2026-09-10T06-51-25-272Z-10881/actual/app.home.index-1440.png) · [Expected](baseline/2026-09-10T06-51-25-272Z-10881/expected/app.home.index-1440.png) · [Diff](baseline/2026-09-10T06-51-25-272Z-10881/diff/app.home.index-1440.png) |
| app.journey-detail | 375 | — | — | UNVERIFIED | A real journey identity has not been aligned. |
| app.journey-detail | 768 | — | — | UNVERIFIED | A real journey identity has not been aligned. |
| app.journey-detail | 1024 | — | — | UNVERIFIED | A real journey identity has not been aligned. |
| app.journey-detail | 1440 | — | — | UNVERIFIED | A real journey identity has not been aligned. |
| app.journeys | 375 | — | — | UNVERIFIED | No independently configured active-reference state yet. |
| app.journeys | 768 | — | — | UNVERIFIED | No independently configured active-reference state yet. |
| app.journeys | 1024 | — | — | UNVERIFIED | No independently configured active-reference state yet. |
| app.journeys | 1440 | — | — | UNVERIFIED | No independently configured active-reference state yet. |
| app.legal | 375 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.legal | 768 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.legal | 1024 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.legal | 1440 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.not-found | 375 | — | — | MISSING_COUNTERPART | The active modular reference does not expose a 404 state. |
| app.not-found | 768 | — | — | MISSING_COUNTERPART | The active modular reference does not expose a 404 state. |
| app.not-found | 1024 | — | — | MISSING_COUNTERPART | The active modular reference does not expose a 404 state. |
| app.not-found | 1440 | — | — | MISSING_COUNTERPART | The active modular reference does not expose a 404 state. |
| app.notifications | 375 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.notifications | 768 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.notifications | 1024 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.notifications | 1440 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.onboarding | 375 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.onboarding | 768 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.onboarding | 1024 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.onboarding | 1440 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.profile | 375 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.profile | 768 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.profile | 1024 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.profile | 1440 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.resource.detail | 375 | 367649 | 35.2915% | FAIL | [Actual](baseline/2026-09-10T06-51-25-272Z-10881/actual/app.resource.detail-375.png) · [Expected](baseline/2026-09-10T06-51-25-272Z-10881/expected/app.resource.detail-375.png) · [Diff](baseline/2026-09-10T06-51-25-272Z-10881/diff/app.resource.detail-375.png) |
| app.resource.detail | 768 | 810115 | 41.9919% | FAIL | [Actual](baseline/2026-09-10T06-51-25-272Z-10881/actual/app.resource.detail-768.png) · [Expected](baseline/2026-09-10T06-51-25-272Z-10881/expected/app.resource.detail-768.png) · [Diff](baseline/2026-09-10T06-51-25-272Z-10881/diff/app.resource.detail-768.png) |
| app.resource.detail | 1024 | 559543 | 31.9176% | FAIL | [Actual](baseline/2026-09-10T06-51-25-272Z-10881/actual/app.resource.detail-1024.png) · [Expected](baseline/2026-09-10T06-51-25-272Z-10881/expected/app.resource.detail-1024.png) · [Diff](baseline/2026-09-10T06-51-25-272Z-10881/diff/app.resource.detail-1024.png) |
| app.resource.detail | 1440 | 286571 | 14.4000% | FAIL | [Actual](baseline/2026-09-10T06-51-25-272Z-10881/actual/app.resource.detail-1440.png) · [Expected](baseline/2026-09-10T06-51-25-272Z-10881/expected/app.resource.detail-1440.png) · [Diff](baseline/2026-09-10T06-51-25-272Z-10881/diff/app.resource.detail-1440.png) |
| app.search | 375 | — | — | MISSING_COUNTERPART | The current modular reference has no independently routeable search-results state. |
| app.search | 768 | — | — | MISSING_COUNTERPART | The current modular reference has no independently routeable search-results state. |
| app.search | 1024 | — | — | MISSING_COUNTERPART | The current modular reference has no independently routeable search-results state. |
| app.search | 1440 | — | — | MISSING_COUNTERPART | The current modular reference has no independently routeable search-results state. |
| app.settings | 375 | — | — | UNVERIFIED | No independently configured active-reference state yet. |
| app.settings | 768 | — | — | UNVERIFIED | No independently configured active-reference state yet. |
| app.settings | 1024 | — | — | UNVERIFIED | No independently configured active-reference state yet. |
| app.settings | 1440 | — | — | UNVERIFIED | No independently configured active-reference state yet. |
| app.settings.theme | 375 | — | — | MISSING_COUNTERPART | Counterpart belongs to an older non-active page family and is not routeable in the approved modular target. |
| app.settings.theme | 768 | — | — | MISSING_COUNTERPART | Counterpart belongs to an older non-active page family and is not routeable in the approved modular target. |
| app.settings.theme | 1024 | — | — | MISSING_COUNTERPART | Counterpart belongs to an older non-active page family and is not routeable in the approved modular target. |
| app.settings.theme | 1440 | — | — | MISSING_COUNTERPART | Counterpart belongs to an older non-active page family and is not routeable in the approved modular target. |
| app.shell.default | 375 | — | — | ALIAS | Actual · Expected · Diff |
| app.shell.default | 768 | — | — | ALIAS | Actual · Expected · Diff |
| app.shell.default | 1024 | — | — | ALIAS | Actual · Expected · Diff |
| app.shell.default | 1440 | — | — | ALIAS | Actual · Expected · Diff |
| app.shell.mobile-drawer | 375 | 1063852 | 52.0253% | FAIL | [Actual](baseline/2026-09-10T06-51-25-272Z-10881/actual/app.shell.mobile-drawer-375.png) · [Expected](baseline/2026-09-10T06-51-25-272Z-10881/expected/app.shell.mobile-drawer-375.png) · [Diff](baseline/2026-09-10T06-51-25-272Z-10881/diff/app.shell.mobile-drawer-375.png) |
| app.shell.palette | 375 | 1064202 | 52.0424% | FAIL | [Actual](baseline/2026-09-10T06-51-25-272Z-10881/actual/app.shell.palette-375.png) · [Expected](baseline/2026-09-10T06-51-25-272Z-10881/expected/app.shell.palette-375.png) · [Diff](baseline/2026-09-10T06-51-25-272Z-10881/diff/app.shell.palette-375.png) |
| app.shell.palette | 768 | 1534316 | 52.0805% | FAIL | [Actual](baseline/2026-09-10T06-51-25-272Z-10881/actual/app.shell.palette-768.png) · [Expected](baseline/2026-09-10T06-51-25-272Z-10881/expected/app.shell.palette-768.png) · [Diff](baseline/2026-09-10T06-51-25-272Z-10881/diff/app.shell.palette-768.png) |
| app.shell.palette | 1024 | 2154670 | 59.6251% | FAIL | [Actual](baseline/2026-09-10T06-51-25-272Z-10881/actual/app.shell.palette-1024.png) · [Expected](baseline/2026-09-10T06-51-25-272Z-10881/expected/app.shell.palette-1024.png) · [Diff](baseline/2026-09-10T06-51-25-272Z-10881/diff/app.shell.palette-1024.png) |
| app.shell.palette | 1440 | 2391008 | 55.7938% | FAIL | [Actual](baseline/2026-09-10T06-51-25-272Z-10881/actual/app.shell.palette-1440.png) · [Expected](baseline/2026-09-10T06-51-25-272Z-10881/expected/app.shell.palette-1440.png) · [Diff](baseline/2026-09-10T06-51-25-272Z-10881/diff/app.shell.palette-1440.png) |
| app.subcategory | 375 | 2899267 | 49.1349% | FAIL | [Actual](baseline/2026-09-10T06-51-25-272Z-10881/actual/app.subcategory-375.png) · [Expected](baseline/2026-09-10T06-51-25-272Z-10881/expected/app.subcategory-375.png) · [Diff](baseline/2026-09-10T06-51-25-272Z-10881/diff/app.subcategory-375.png) |
| app.subcategory | 768 | 1060977 | 16.6524% | FAIL | [Actual](baseline/2026-09-10T06-51-25-272Z-10881/actual/app.subcategory-768.png) · [Expected](baseline/2026-09-10T06-51-25-272Z-10881/expected/app.subcategory-768.png) · [Diff](baseline/2026-09-10T06-51-25-272Z-10881/diff/app.subcategory-768.png) |
| app.subcategory | 1024 | 2047906 | 25.4150% | FAIL | [Actual](baseline/2026-09-10T06-51-25-272Z-10881/actual/app.subcategory-1024.png) · [Expected](baseline/2026-09-10T06-51-25-272Z-10881/expected/app.subcategory-1024.png) · [Diff](baseline/2026-09-10T06-51-25-272Z-10881/diff/app.subcategory-1024.png) |
| app.subcategory | 1440 | 2917238 | 35.1285% | FAIL | [Actual](baseline/2026-09-10T06-51-25-272Z-10881/actual/app.subcategory-1440.png) · [Expected](baseline/2026-09-10T06-51-25-272Z-10881/expected/app.subcategory-1440.png) · [Diff](baseline/2026-09-10T06-51-25-272Z-10881/diff/app.subcategory-1440.png) |
| app.submit | 375 | — | — | BLOCKED | Authentication is fail-closed; no privileged fixture or test identity is supplied. |
| app.submit | 768 | — | — | BLOCKED | Authentication is fail-closed; no privileged fixture or test identity is supplied. |
| app.submit | 1024 | — | — | BLOCKED | Authentication is fail-closed; no privileged fixture or test identity is supplied. |
| app.submit | 1440 | — | — | BLOCKED | Authentication is fail-closed; no privileged fixture or test identity is supplied. |
| app.subsubcategory | 375 | — | — | UNVERIFIED | No independently configured active-reference state yet. |
| app.subsubcategory | 768 | — | — | UNVERIFIED | No independently configured active-reference state yet. |
| app.subsubcategory | 1024 | — | — | UNVERIFIED | No independently configured active-reference state yet. |
| app.subsubcategory | 1440 | — | — | UNVERIFIED | No independently configured active-reference state yet. |
| app.tag | 375 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.tag | 768 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.tag | 1024 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| app.tag | 1440 | — | — | UNVERIFIED | Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator. |
| artifact.anatomy.flows | 375 | — | — | MISSING_COUNTERPART | The registered artifact has no independently routeable anatomy state; both captures are diagnostic only. |
| artifact.anatomy.flows | 768 | — | — | MISSING_COUNTERPART | The registered artifact has no independently routeable anatomy state; both captures are diagnostic only. |
| artifact.anatomy.flows | 1024 | — | — | MISSING_COUNTERPART | The registered artifact has no independently routeable anatomy state; both captures are diagnostic only. |
| artifact.anatomy.flows | 1440 | — | — | MISSING_COUNTERPART | The registered artifact has no independently routeable anatomy state; both captures are diagnostic only. |
| artifact.docs.a11y | 375 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Accessibility"; both captures are diagnostic only. |
| artifact.docs.a11y | 768 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Accessibility"; both captures are diagnostic only. |
| artifact.docs.a11y | 1024 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Accessibility"; both captures are diagnostic only. |
| artifact.docs.a11y | 1440 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Accessibility"; both captures are diagnostic only. |
| artifact.docs.buttons | 375 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Buttons"; both captures are diagnostic only. |
| artifact.docs.buttons | 768 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Buttons"; both captures are diagnostic only. |
| artifact.docs.buttons | 1024 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Buttons"; both captures are diagnostic only. |
| artifact.docs.buttons | 1440 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Buttons"; both captures are diagnostic only. |
| artifact.docs.cards | 375 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Cards"; both captures are diagnostic only. |
| artifact.docs.cards | 768 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Cards"; both captures are diagnostic only. |
| artifact.docs.cards | 1024 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Cards"; both captures are diagnostic only. |
| artifact.docs.cards | 1440 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Cards"; both captures are diagnostic only. |
| artifact.docs.checklist | 375 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Launch checklist"; both captures are diagnostic only. |
| artifact.docs.checklist | 768 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Launch checklist"; both captures are diagnostic only. |
| artifact.docs.checklist | 1024 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Launch checklist"; both captures are diagnostic only. |
| artifact.docs.checklist | 1440 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Launch checklist"; both captures are diagnostic only. |
| artifact.docs.color | 375 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Color & accent"; both captures are diagnostic only. |
| artifact.docs.color | 768 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Color & accent"; both captures are diagnostic only. |
| artifact.docs.color | 1024 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Color & accent"; both captures are diagnostic only. |
| artifact.docs.color | 1440 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Color & accent"; both captures are diagnostic only. |
| artifact.docs.data-density | 375 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Data density"; both captures are diagnostic only. |
| artifact.docs.data-density | 768 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Data density"; both captures are diagnostic only. |
| artifact.docs.data-density | 1024 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Data density"; both captures are diagnostic only. |
| artifact.docs.data-density | 1440 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Data density"; both captures are diagnostic only. |
| artifact.docs.flows | 375 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Flow diagrams"; both captures are diagnostic only. |
| artifact.docs.flows | 768 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Flow diagrams"; both captures are diagnostic only. |
| artifact.docs.flows | 1024 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Flow diagrams"; both captures are diagnostic only. |
| artifact.docs.flows | 1440 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Flow diagrams"; both captures are diagnostic only. |
| artifact.docs.forms | 375 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Forms"; both captures are diagnostic only. |
| artifact.docs.forms | 768 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Forms"; both captures are diagnostic only. |
| artifact.docs.forms | 1024 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Forms"; both captures are diagnostic only. |
| artifact.docs.forms | 1440 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Forms"; both captures are diagnostic only. |
| artifact.docs.getting-started | 375 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Getting started"; both captures are diagnostic only. |
| artifact.docs.getting-started | 768 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Getting started"; both captures are diagnostic only. |
| artifact.docs.getting-started | 1024 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Getting started"; both captures are diagnostic only. |
| artifact.docs.getting-started | 1440 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Getting started"; both captures are diagnostic only. |
| artifact.docs.integration | 375 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Integrate the system"; both captures are diagnostic only. |
| artifact.docs.integration | 768 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Integrate the system"; both captures are diagnostic only. |
| artifact.docs.integration | 1024 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Integrate the system"; both captures are diagnostic only. |
| artifact.docs.integration | 1440 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Integrate the system"; both captures are diagnostic only. |
| artifact.docs.lists | 375 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "List patterns"; both captures are diagnostic only. |
| artifact.docs.lists | 768 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "List patterns"; both captures are diagnostic only. |
| artifact.docs.lists | 1024 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "List patterns"; both captures are diagnostic only. |
| artifact.docs.lists | 1440 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "List patterns"; both captures are diagnostic only. |
| artifact.docs.motion | 375 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Motion"; both captures are diagnostic only. |
| artifact.docs.motion | 768 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Motion"; both captures are diagnostic only. |
| artifact.docs.motion | 1024 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Motion"; both captures are diagnostic only. |
| artifact.docs.motion | 1440 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Motion"; both captures are diagnostic only. |
| artifact.docs.navigation | 375 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Navigation"; both captures are diagnostic only. |
| artifact.docs.navigation | 768 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Navigation"; both captures are diagnostic only. |
| artifact.docs.navigation | 1024 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Navigation"; both captures are diagnostic only. |
| artifact.docs.navigation | 1440 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Navigation"; both captures are diagnostic only. |
| artifact.docs.overview | 375 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router; both captures are diagnostic only. |
| artifact.docs.overview | 768 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router; both captures are diagnostic only. |
| artifact.docs.overview | 1024 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router; both captures are diagnostic only. |
| artifact.docs.overview | 1440 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router; both captures are diagnostic only. |
| artifact.docs.pages | 375 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Page templates"; both captures are diagnostic only. |
| artifact.docs.pages | 768 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Page templates"; both captures are diagnostic only. |
| artifact.docs.pages | 1024 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Page templates"; both captures are diagnostic only. |
| artifact.docs.pages | 1440 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Page templates"; both captures are diagnostic only. |
| artifact.docs.principles | 375 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Principles"; both captures are diagnostic only. |
| artifact.docs.principles | 768 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Principles"; both captures are diagnostic only. |
| artifact.docs.principles | 1024 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Principles"; both captures are diagnostic only. |
| artifact.docs.principles | 1440 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Principles"; both captures are diagnostic only. |
| artifact.docs.spacing | 375 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Spacing & layout"; both captures are diagnostic only. |
| artifact.docs.spacing | 768 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Spacing & layout"; both captures are diagnostic only. |
| artifact.docs.spacing | 1024 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Spacing & layout"; both captures are diagnostic only. |
| artifact.docs.spacing | 1440 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Spacing & layout"; both captures are diagnostic only. |
| artifact.docs.theming | 375 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Theming & switching"; both captures are diagnostic only. |
| artifact.docs.theming | 768 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Theming & switching"; both captures are diagnostic only. |
| artifact.docs.theming | 1024 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Theming & switching"; both captures are diagnostic only. |
| artifact.docs.theming | 1440 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Theming & switching"; both captures are diagnostic only. |
| artifact.docs.theming-app | 375 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Theming an app"; both captures are diagnostic only. |
| artifact.docs.theming-app | 768 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Theming an app"; both captures are diagnostic only. |
| artifact.docs.theming-app | 1024 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Theming an app"; both captures are diagnostic only. |
| artifact.docs.theming-app | 1440 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Theming an app"; both captures are diagnostic only. |
| artifact.docs.tokens | 375 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Token contract"; both captures are diagnostic only. |
| artifact.docs.tokens | 768 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Token contract"; both captures are diagnostic only. |
| artifact.docs.tokens | 1024 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Token contract"; both captures are diagnostic only. |
| artifact.docs.tokens | 1440 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Token contract"; both captures are diagnostic only. |
| artifact.docs.typography | 375 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Typography"; both captures are diagnostic only. |
| artifact.docs.typography | 768 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Typography"; both captures are diagnostic only. |
| artifact.docs.typography | 1024 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Typography"; both captures are diagnostic only. |
| artifact.docs.typography | 1440 | — | — | MISSING_COUNTERPART | The registered artifact has no docs hash router for "Typography"; both captures are diagnostic only. |
| artifact.showcase | 375 | 12301068 | 81.2760% | FAIL | [Actual](baseline/2026-09-10T06-51-25-272Z-10881/actual/artifact.showcase-375.png) · [Expected](baseline/2026-09-10T06-51-25-272Z-10881/expected/artifact.showcase-375.png) · [Diff](baseline/2026-09-10T06-51-25-272Z-10881/diff/artifact.showcase-375.png) |
| artifact.showcase | 768 | 5239624 | 53.6228% | FAIL | [Actual](baseline/2026-09-10T06-51-25-272Z-10881/actual/artifact.showcase-768.png) · [Expected](baseline/2026-09-10T06-51-25-272Z-10881/expected/artifact.showcase-768.png) · [Diff](baseline/2026-09-10T06-51-25-272Z-10881/diff/artifact.showcase-768.png) |
| artifact.showcase | 1024 | 8366865 | 67.8861% | FAIL | [Actual](baseline/2026-09-10T06-51-25-272Z-10881/actual/artifact.showcase-1024.png) · [Expected](baseline/2026-09-10T06-51-25-272Z-10881/expected/artifact.showcase-1024.png) · [Diff](baseline/2026-09-10T06-51-25-272Z-10881/diff/artifact.showcase-1024.png) |
| artifact.showcase | 1440 | 10552640 | 64.4069% | FAIL | [Actual](baseline/2026-09-10T06-51-25-272Z-10881/actual/artifact.showcase-1440.png) · [Expected](baseline/2026-09-10T06-51-25-272Z-10881/expected/artifact.showcase-1440.png) · [Diff](baseline/2026-09-10T06-51-25-272Z-10881/diff/artifact.showcase-1440.png) |

## Reproducibility

Chromium 148.0.7778.96; DPR 1; en-US; UTC; dark color scheme; reduced motion; pixelmatch threshold 0.1; pass ceiling 0.5%. Expected and actual are full-page captures. Unequal images use an unscaled union canvas and fail regardless of percentage.

The immutable machine result and source hashes are in [`results.json`](baseline/2026-09-10T06-51-25-272Z-10881/results.json), and SHA-256 hashes for every evidence output are in [`OUTPUT-MANIFEST.json`](baseline/2026-09-10T06-51-25-272Z-10881/OUTPUT-MANIFEST.json). The reference server served a pre-hashed in-memory snapshot, was loopback-only and ephemeral, and was closed before these files were copied into the repository.
