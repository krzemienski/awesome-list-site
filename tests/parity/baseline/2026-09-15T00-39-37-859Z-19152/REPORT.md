# Visual parity report

Run: `2026-09-15T00-39-37-859Z-19152`  
Claim: **incomplete-evidence**  
Gate: **NOT PASSED** (exit code 2)  
Identity: disposable Clerk admin `2043251783` "Nick" (torn down: local row deleted, Clerk user deleted, 1 __qa_test_parity_ rows remaining)  
Frozen clock: `2026-09-15T00:39:00.000Z` on both sides.  
Denominator: 0 pass / 12 fail / **12** pixel rows executed. 180 row-incomplete, 40 blocked, 0 evidence-only, 96 token-only, 4 aliases, 0 not selected.

Selected run (`--only app.about,app.admin.approvals,app.admin.audit,app.admin.categories,app.admin.database,app.admin.digests,app.admin.edits,app.admin.enrichment,app.admin.export,app.admin.github,app.admin.journeys,app.admin.linkhealth,app.admin.overview,app.admin.research,app.admin.researcher,app.admin.resources,app.admin.subcategories,app.admin.subsubcategories,app.admin.users,app.advanced,app.auth.sign-in,app.auth.sign-up,app.bookmarks,app.categories,app.category,app.collection,app.contributions,app.error.empty,app.error.loading,app.error.route,app.home.curated,app.home.index,app.journey-detail,app.journeys,app.legal,app.not-found,app.notifications,app.onboarding,app.profile,app.resource.detail,app.search,app.settings,app.settings.theme,app.shell.default,app.shell.mobile-drawer,app.shell.palette,app.subcategory,app.submit,app.subsubcategory,app.system.code-of-conduct,app.system.consent,app.system.design-system,app.system.empty-search,app.system.error,app.system.loading,app.system.not-found,app.system.privacy,app.system.terms,app.system.toast,app.tag,artifact.anatomy.flows,artifact.docs.a11y,artifact.docs.buttons,artifact.docs.cards,artifact.docs.checklist,artifact.docs.color,artifact.docs.data-density,artifact.docs.flows,artifact.docs.forms,artifact.docs.getting-started,artifact.docs.integration,artifact.docs.lists,artifact.docs.motion,artifact.docs.navigation,artifact.docs.overview,artifact.docs.pages,artifact.docs.principles,artifact.docs.spacing,artifact.docs.theming,artifact.docs.theming-app,artifact.docs.tokens,artifact.docs.typography,artifact.showcase`): 332 rows executed; rows outside the selection are not listed and the gate is diagnostic only.

## Eligibility

| Class | Screens | Meaning |
|---|---:|---|
| pixel | 48 | Compared pixel-for-pixel at 375/768/1024/1440 (or the row's declared widths); counted in the denominator. |
| token-only | 24 | Design has no counterpart; verified by token audits, never by pixels. |
| artifact-docs | 1 | Design-system docs chapters; captured as evidence, excluded from the denominator. |
| blocked | 10 | Cannot be compared yet; each row carries its reason. |

## Rows

| Screen | Width | Class | Status | Diff px | Diff % | Actual vs expected size | Evidence / reason |
|---|---:|---|---|---:|---:|---|---|
| app.about | 375 | pixel | FAIL | 1923460 | 66.3462% | 375×7731 vs 375×2743 | [actual](/actual/app.about-375.png) · [expected](/expected/app.about-375.png) · [diff](/diff/app.about-375.png) — 66.346% differing pixels exceeds the 0.5% ceiling |
| app.about | 768 | pixel | FAIL | 2442447 | 63.9893% | 768×4970 vs 768×1865 | [actual](/actual/app.about-768.png) · [expected](/expected/app.about-768.png) · [diff](/diff/app.about-768.png) — 63.989% differing pixels exceeds the 0.5% ceiling |
| app.about | 1024 | pixel | FAIL | 3017715 | 70.2667% | 1024×4194 vs 1024×1300 | [actual](/actual/app.about-1024.png) · [expected](/expected/app.about-1024.png) · [diff](/diff/app.about-1024.png) — 70.267% differing pixels exceeds the 0.5% ceiling |
| app.about | 1440 | pixel | FAIL | 4222542 | 69.9004% | 1440×4195 vs 1440×1301 | [actual](/actual/app.about-1440.png) · [expected](/expected/app.about-1440.png) · [diff](/diff/app.about-1440.png) — 69.900% differing pixels exceeds the 0.5% ceiling |
| app.admin.approvals | 375 | pixel | FAIL | 118823 | 28.5461% | 375×868 vs 375×1110 | [actual](/actual/app.admin.approvals-375.png) · [expected](/expected/app.admin.approvals-375.png) · [diff](/diff/app.admin.approvals-375.png) — 28.546% differing pixels exceeds the 0.5% ceiling |
| app.admin.approvals | 768 | pixel | FAIL | 38378 | 4.8800% | 768×1024 vs 768×1024 | [actual](/actual/app.admin.approvals-768.png) · [expected](/expected/app.admin.approvals-768.png) · [diff](/diff/app.admin.approvals-768.png) — 4.880% differing pixels exceeds the 0.5% ceiling |
| app.admin.approvals | 1024 | pixel | FAIL | 61306 | 7.6073% | 1024×787 vs 1024×768 | [actual](/actual/app.admin.approvals-1024.png) · [expected](/expected/app.admin.approvals-1024.png) · [diff](/diff/app.admin.approvals-1024.png) — 7.607% differing pixels exceeds the 0.5% ceiling |
| app.admin.approvals | 1440 | pixel | FAIL | 41959 | 3.2376% | 1440×900 vs 1440×900 | [actual](/actual/app.admin.approvals-1440.png) · [expected](/expected/app.admin.approvals-1440.png) · [diff](/diff/app.admin.approvals-1440.png) — 3.238% differing pixels exceeds the 0.5% ceiling |
| app.admin.audit | 375 | pixel | FAIL | 1275254 | 70.5242% | 375×4822 vs 375×1498 | [actual](/actual/app.admin.audit-375.png) · [expected](/expected/app.admin.audit-375.png) · [diff](/diff/app.admin.audit-375.png) — 70.524% differing pixels exceeds the 0.5% ceiling |
| app.admin.audit | 768 | pixel | FAIL | 2495770 | 71.3906% | 768×4552 vs 768×1355 | [actual](/actual/app.admin.audit-768.png) · [expected](/expected/app.admin.audit-768.png) · [diff](/diff/app.admin.audit-768.png) — 71.391% differing pixels exceeds the 0.5% ceiling |
| app.admin.audit | 1024 | pixel | FAIL | 3485531 | 75.3395% | 1024×4518 vs 1024×1158 | [actual](/actual/app.admin.audit-1024.png) · [expected](/expected/app.admin.audit-1024.png) · [diff](/diff/app.admin.audit-1024.png) — 75.340% differing pixels exceeds the 0.5% ceiling |
| app.admin.audit | 1440 | pixel | FAIL | 4884757 | 75.0817% | 1440×4518 vs 1440×1158 | [actual](/actual/app.admin.audit-1440.png) · [expected](/expected/app.admin.audit-1440.png) · [diff](/diff/app.admin.audit-1440.png) — 75.082% differing pixels exceeds the 0.5% ceiling |
| app.admin.categories | 375 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.screenshot: Target page, context or browser has been closed |
| app.admin.categories | 768 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.categories | 1024 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.categories | 1440 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.database | 375 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.database | 768 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.database | 1024 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.database | 1440 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.digests | 375 | token-only | UNVERIFIED | — | — | — | App tab "Digests" has no design counterpart tab in ADMIN_TABS; verified through table and form tokens. |
| app.admin.digests | 768 | token-only | UNVERIFIED | — | — | — | App tab "Digests" has no design counterpart tab in ADMIN_TABS; verified through table and form tokens. |
| app.admin.digests | 1024 | token-only | UNVERIFIED | — | — | — | App tab "Digests" has no design counterpart tab in ADMIN_TABS; verified through table and form tokens. |
| app.admin.digests | 1440 | token-only | UNVERIFIED | — | — | — | App tab "Digests" has no design counterpart tab in ADMIN_TABS; verified through table and form tokens. |
| app.admin.edits | 375 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.edits | 768 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.edits | 1024 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.edits | 1440 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.enrichment | 375 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.enrichment | 768 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.enrichment | 1024 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.enrichment | 1440 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.export | 375 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.export | 768 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.export | 1024 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.export | 1440 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.github | 375 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.github | 768 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.github | 1024 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.github | 1440 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.journeys | 375 | token-only | UNVERIFIED | — | — | — | App tab "Journeys" has no design counterpart tab in ADMIN_TABS; verified through table and form tokens. |
| app.admin.journeys | 768 | token-only | UNVERIFIED | — | — | — | App tab "Journeys" has no design counterpart tab in ADMIN_TABS; verified through table and form tokens. |
| app.admin.journeys | 1024 | token-only | UNVERIFIED | — | — | — | App tab "Journeys" has no design counterpart tab in ADMIN_TABS; verified through table and form tokens. |
| app.admin.journeys | 1440 | token-only | UNVERIFIED | — | — | — | App tab "Journeys" has no design counterpart tab in ADMIN_TABS; verified through table and form tokens. |
| app.admin.linkhealth | 375 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.linkhealth | 768 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.linkhealth | 1024 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.linkhealth | 1440 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.overview | 375 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.overview | 768 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.overview | 1024 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.overview | 1440 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.research | 375 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.research | 768 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.research | 1024 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.research | 1440 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.researcher | 375 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.researcher | 768 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.researcher | 1024 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.researcher | 1440 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.resources | 375 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.resources | 768 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.resources | 1024 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.resources | 1440 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.subcategories | 375 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.subcategories | 768 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.subcategories | 1024 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.subcategories | 1440 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.subsubcategories | 375 | token-only | UNVERIFIED | — | — | — | App tab "Sub-subcategories" has no design counterpart tab in ADMIN_TABS; verified through table and form tokens. |
| app.admin.subsubcategories | 768 | token-only | UNVERIFIED | — | — | — | App tab "Sub-subcategories" has no design counterpart tab in ADMIN_TABS; verified through table and form tokens. |
| app.admin.subsubcategories | 1024 | token-only | UNVERIFIED | — | — | — | App tab "Sub-subcategories" has no design counterpart tab in ADMIN_TABS; verified through table and form tokens. |
| app.admin.subsubcategories | 1440 | token-only | UNVERIFIED | — | — | — | App tab "Sub-subcategories" has no design counterpart tab in ADMIN_TABS; verified through table and form tokens. |
| app.admin.users | 375 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.users | 768 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.users | 1024 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.admin.users | 1440 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.advanced | 375 | blocked | BLOCKED | — | — | — | No independently configured active-reference state exists for advanced search. |
| app.advanced | 768 | blocked | BLOCKED | — | — | — | No independently configured active-reference state exists for advanced search. |
| app.advanced | 1024 | blocked | BLOCKED | — | — | — | No independently configured active-reference state exists for advanced search. |
| app.advanced | 1440 | blocked | BLOCKED | — | — | — | No independently configured active-reference state exists for advanced search. |
| app.auth.sign-in | 375 | blocked | BLOCKED | — | — | — | Sign-in is Clerk's hosted component; the reference has no sign-in screen and no auth fixture is permitted. |
| app.auth.sign-in | 768 | blocked | BLOCKED | — | — | — | Sign-in is Clerk's hosted component; the reference has no sign-in screen and no auth fixture is permitted. |
| app.auth.sign-in | 1024 | blocked | BLOCKED | — | — | — | Sign-in is Clerk's hosted component; the reference has no sign-in screen and no auth fixture is permitted. |
| app.auth.sign-in | 1440 | blocked | BLOCKED | — | — | — | Sign-in is Clerk's hosted component; the reference has no sign-in screen and no auth fixture is permitted. |
| app.auth.sign-up | 375 | blocked | BLOCKED | — | — | — | Sign-up is Clerk's hosted component (captcha-gated); the reference has no sign-up screen. |
| app.auth.sign-up | 768 | blocked | BLOCKED | — | — | — | Sign-up is Clerk's hosted component (captcha-gated); the reference has no sign-up screen. |
| app.auth.sign-up | 1024 | blocked | BLOCKED | — | — | — | Sign-up is Clerk's hosted component (captcha-gated); the reference has no sign-up screen. |
| app.auth.sign-up | 1440 | blocked | BLOCKED | — | — | — | Sign-up is Clerk's hosted component (captcha-gated); the reference has no sign-up screen. |
| app.bookmarks | 375 | token-only | UNVERIFIED | — | — | — | The reference has no bookmarks page; verified through list-pattern tokens. |
| app.bookmarks | 768 | token-only | UNVERIFIED | — | — | — | The reference has no bookmarks page; verified through list-pattern tokens. |
| app.bookmarks | 1024 | token-only | UNVERIFIED | — | — | — | The reference has no bookmarks page; verified through list-pattern tokens. |
| app.bookmarks | 1440 | token-only | UNVERIFIED | — | — | — | The reference has no bookmarks page; verified through list-pattern tokens. |
| app.categories | 375 | blocked | BLOCKED | — | — | — | No independently configured active-reference state exists for the all-categories page. |
| app.categories | 768 | blocked | BLOCKED | — | — | — | No independently configured active-reference state exists for the all-categories page. |
| app.categories | 1024 | blocked | BLOCKED | — | — | — | No independently configured active-reference state exists for the all-categories page. |
| app.categories | 1440 | blocked | BLOCKED | — | — | — | No independently configured active-reference state exists for the all-categories page. |
| app.category | 375 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.category | 768 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.category | 1024 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.category | 1440 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.collection | 375 | token-only | UNVERIFIED | — | — | — | The reference has no collection page; verified through shared list-pattern tokens instead of pixels. |
| app.collection | 768 | token-only | UNVERIFIED | — | — | — | The reference has no collection page; verified through shared list-pattern tokens instead of pixels. |
| app.collection | 1024 | token-only | UNVERIFIED | — | — | — | The reference has no collection page; verified through shared list-pattern tokens instead of pixels. |
| app.collection | 1440 | token-only | UNVERIFIED | — | — | — | The reference has no collection page; verified through shared list-pattern tokens instead of pixels. |
| app.contributions | 375 | token-only | UNVERIFIED | — | — | — | The reference has no contributions page; verified through table tokens. |
| app.contributions | 768 | token-only | UNVERIFIED | — | — | — | The reference has no contributions page; verified through table tokens. |
| app.contributions | 1024 | token-only | UNVERIFIED | — | — | — | The reference has no contributions page; verified through table tokens. |
| app.contributions | 1440 | token-only | UNVERIFIED | — | — | — | The reference has no contributions page; verified through table tokens. |
| app.error.empty | 375 | token-only | UNVERIFIED | — | — | — | Empty states need an empty catalog slice; verified through empty-state tokens, not pixels. |
| app.error.empty | 768 | token-only | UNVERIFIED | — | — | — | Empty states need an empty catalog slice; verified through empty-state tokens, not pixels. |
| app.error.empty | 1024 | token-only | UNVERIFIED | — | — | — | Empty states need an empty catalog slice; verified through empty-state tokens, not pixels. |
| app.error.empty | 1440 | token-only | UNVERIFIED | — | — | — | Empty states need an empty catalog slice; verified through empty-state tokens, not pixels. |
| app.error.loading | 375 | token-only | UNVERIFIED | — | — | — | Loading skeletons are transient; verified through skeleton tokens, not pixels. |
| app.error.loading | 768 | token-only | UNVERIFIED | — | — | — | Loading skeletons are transient; verified through skeleton tokens, not pixels. |
| app.error.loading | 1024 | token-only | UNVERIFIED | — | — | — | Loading skeletons are transient; verified through skeleton tokens, not pixels. |
| app.error.loading | 1440 | token-only | UNVERIFIED | — | — | — | Loading skeletons are transient; verified through skeleton tokens, not pixels. |
| app.error.route | 375 | token-only | UNVERIFIED | — | — | — | Error injection is prohibited; no naturally occurring real error state is supplied. |
| app.error.route | 768 | token-only | UNVERIFIED | — | — | — | Error injection is prohibited; no naturally occurring real error state is supplied. |
| app.error.route | 1024 | token-only | UNVERIFIED | — | — | — | Error injection is prohibited; no naturally occurring real error state is supplied. |
| app.error.route | 1440 | token-only | UNVERIFIED | — | — | — | Error injection is prohibited; no naturally occurring real error state is supplied. |
| app.home.curated | 375 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.home.curated | 768 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.home.curated | 1024 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.home.curated | 1440 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.home.index | 375 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.home.index | 768 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.home.index | 1024 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.home.index | 1440 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.journey-detail | 375 | blocked | BLOCKED | — | — | — | A real journey identity has not been aligned with the reference. |
| app.journey-detail | 768 | blocked | BLOCKED | — | — | — | A real journey identity has not been aligned with the reference. |
| app.journey-detail | 1024 | blocked | BLOCKED | — | — | — | A real journey identity has not been aligned with the reference. |
| app.journey-detail | 1440 | blocked | BLOCKED | — | — | — | A real journey identity has not been aligned with the reference. |
| app.journeys | 375 | blocked | BLOCKED | — | — | — | No independently configured active-reference state exists for journeys. |
| app.journeys | 768 | blocked | BLOCKED | — | — | — | No independently configured active-reference state exists for journeys. |
| app.journeys | 1024 | blocked | BLOCKED | — | — | — | No independently configured active-reference state exists for journeys. |
| app.journeys | 1440 | blocked | BLOCKED | — | — | — | No independently configured active-reference state exists for journeys. |
| app.legal | 375 | token-only | UNVERIFIED | — | — | — | The reference has no legal pages; verified through prose tokens instead of pixels. |
| app.legal | 768 | token-only | UNVERIFIED | — | — | — | The reference has no legal pages; verified through prose tokens instead of pixels. |
| app.legal | 1024 | token-only | UNVERIFIED | — | — | — | The reference has no legal pages; verified through prose tokens instead of pixels. |
| app.legal | 1440 | token-only | UNVERIFIED | — | — | — | The reference has no legal pages; verified through prose tokens instead of pixels. |
| app.not-found | 375 | blocked | BLOCKED | — | — | — | The active modular reference does not expose a 404 state. |
| app.not-found | 768 | blocked | BLOCKED | — | — | — | The active modular reference does not expose a 404 state. |
| app.not-found | 1024 | blocked | BLOCKED | — | — | — | The active modular reference does not expose a 404 state. |
| app.not-found | 1440 | blocked | BLOCKED | — | — | — | The active modular reference does not expose a 404 state. |
| app.notifications | 375 | token-only | UNVERIFIED | — | — | — | The reference has no notifications page; verified through list-pattern tokens. |
| app.notifications | 768 | token-only | UNVERIFIED | — | — | — | The reference has no notifications page; verified through list-pattern tokens. |
| app.notifications | 1024 | token-only | UNVERIFIED | — | — | — | The reference has no notifications page; verified through list-pattern tokens. |
| app.notifications | 1440 | token-only | UNVERIFIED | — | — | — | The reference has no notifications page; verified through list-pattern tokens. |
| app.onboarding | 375 | token-only | UNVERIFIED | — | — | — | The reference has no onboarding flow; verified through form tokens. |
| app.onboarding | 768 | token-only | UNVERIFIED | — | — | — | The reference has no onboarding flow; verified through form tokens. |
| app.onboarding | 1024 | token-only | UNVERIFIED | — | — | — | The reference has no onboarding flow; verified through form tokens. |
| app.onboarding | 1440 | token-only | UNVERIFIED | — | — | — | The reference has no onboarding flow; verified through form tokens. |
| app.profile | 375 | token-only | UNVERIFIED | — | — | — | The reference has no profile page; verified through form and card tokens. |
| app.profile | 768 | token-only | UNVERIFIED | — | — | — | The reference has no profile page; verified through form and card tokens. |
| app.profile | 1024 | token-only | UNVERIFIED | — | — | — | The reference has no profile page; verified through form and card tokens. |
| app.profile | 1440 | token-only | UNVERIFIED | — | — | — | The reference has no profile page; verified through form and card tokens. |
| app.resource.detail | 375 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.resource.detail | 768 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.resource.detail | 1024 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.resource.detail | 1440 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.search | 375 | blocked | BLOCKED | — | — | — | The modular reference has no independently routeable search-results state; the command palette row (app.shell.palette) covers the search affordance. |
| app.search | 768 | blocked | BLOCKED | — | — | — | The modular reference has no independently routeable search-results state; the command palette row (app.shell.palette) covers the search affordance. |
| app.search | 1024 | blocked | BLOCKED | — | — | — | The modular reference has no independently routeable search-results state; the command palette row (app.shell.palette) covers the search affordance. |
| app.search | 1440 | blocked | BLOCKED | — | — | — | The modular reference has no independently routeable search-results state; the command palette row (app.shell.palette) covers the search affordance. |
| app.settings | 375 | blocked | BLOCKED | — | — | — | No independently configured active-reference state exists for settings. |
| app.settings | 768 | blocked | BLOCKED | — | — | — | No independently configured active-reference state exists for settings. |
| app.settings | 1024 | blocked | BLOCKED | — | — | — | No independently configured active-reference state exists for settings. |
| app.settings | 1440 | blocked | BLOCKED | — | — | — | No independently configured active-reference state exists for settings. |
| app.settings.theme | 375 | blocked | BLOCKED | — | — | — | The theme picker's counterpart is the tweaks panel, which is a host overlay rather than a routeable reference page. |
| app.settings.theme | 768 | blocked | BLOCKED | — | — | — | The theme picker's counterpart is the tweaks panel, which is a host overlay rather than a routeable reference page. |
| app.settings.theme | 1024 | blocked | BLOCKED | — | — | — | The theme picker's counterpart is the tweaks panel, which is a host overlay rather than a routeable reference page. |
| app.settings.theme | 1440 | blocked | BLOCKED | — | — | — | The theme picker's counterpart is the tweaks panel, which is a host overlay rather than a routeable reference page. |
| app.shell.default | 375 | pixel | ALIAS | — | — | — | Shares app.home.index's exact capture identity; excluded from the denominator to prevent double counting. |
| app.shell.default | 768 | pixel | ALIAS | — | — | — | Shares app.home.index's exact capture identity; excluded from the denominator to prevent double counting. |
| app.shell.default | 1024 | pixel | ALIAS | — | — | — | Shares app.home.index's exact capture identity; excluded from the denominator to prevent double counting. |
| app.shell.default | 1440 | pixel | ALIAS | — | — | — | Shares app.home.index's exact capture identity; excluded from the denominator to prevent double counting. |
| app.shell.mobile-drawer | 375 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.shell.mobile-drawer | 768 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.shell.mobile-drawer | 1024 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.shell.mobile-drawer | 1440 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.shell.palette | 375 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.shell.palette | 768 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.shell.palette | 1024 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.shell.palette | 1440 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.subcategory | 375 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.subcategory | 768 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.subcategory | 1024 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.subcategory | 1440 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.submit | 375 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.submit | 768 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.submit | 1024 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.submit | 1440 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.subsubcategory | 375 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.subsubcategory | 768 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.subsubcategory | 1024 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.subsubcategory | 1440 | pixel | INCOMPLETE | — | — | — | infrastructure failure: page.evaluate: Target page, context or browser has been closed |
| app.system.code-of-conduct | 375 | token-only | UNVERIFIED | — | — | — | No canonical legal counterpart; canonical 760px prose composition and tokens. |
| app.system.code-of-conduct | 768 | token-only | UNVERIFIED | — | — | — | No canonical legal counterpart; canonical 760px prose composition and tokens. |
| app.system.code-of-conduct | 1024 | token-only | UNVERIFIED | — | — | — | No canonical legal counterpart; canonical 760px prose composition and tokens. |
| app.system.code-of-conduct | 1440 | token-only | UNVERIFIED | — | — | — | No canonical legal counterpart; canonical 760px prose composition and tokens. |
| app.system.consent | 375 | token-only | UNVERIFIED | — | — | — | Global consent uses canonical surface/button tokens and retains analytics gating and in-flow mobile behavior. |
| app.system.consent | 768 | token-only | UNVERIFIED | — | — | — | Global consent uses canonical surface/button tokens and retains analytics gating and in-flow mobile behavior. |
| app.system.consent | 1024 | token-only | UNVERIFIED | — | — | — | Global consent uses canonical surface/button tokens and retains analytics gating and in-flow mobile behavior. |
| app.system.consent | 1440 | token-only | UNVERIFIED | — | — | — | Global consent uses canonical surface/button tokens and retains analytics gating and in-flow mobile behavior. |
| app.system.design-system | 375 | token-only | UNVERIFIED | — | — | — | Internal live-token/component reference is distinct from the registered artifact and has no canonical page counterpart. |
| app.system.design-system | 768 | token-only | UNVERIFIED | — | — | — | Internal live-token/component reference is distinct from the registered artifact and has no canonical page counterpart. |
| app.system.design-system | 1024 | token-only | UNVERIFIED | — | — | — | Internal live-token/component reference is distinct from the registered artifact and has no canonical page counterpart. |
| app.system.design-system | 1440 | token-only | UNVERIFIED | — | — | — | Internal live-token/component reference is distinct from the registered artifact and has no canonical page counterpart. |
| app.system.empty-search | 375 | token-only | UNVERIFIED | — | — | — | A real zero-result query supplies natural empty-state evidence; page composition belongs to discovery integration. |
| app.system.empty-search | 768 | token-only | UNVERIFIED | — | — | — | A real zero-result query supplies natural empty-state evidence; page composition belongs to discovery integration. |
| app.system.empty-search | 1024 | token-only | UNVERIFIED | — | — | — | A real zero-result query supplies natural empty-state evidence; page composition belongs to discovery integration. |
| app.system.empty-search | 1440 | token-only | UNVERIFIED | — | — | — | A real zero-result query supplies natural empty-state evidence; page composition belongs to discovery integration. |
| app.system.error | 375 | token-only | UNVERIFIED | — | — | — | ErrorPage consumes the canonical error-state pattern. No artificial failure was injected to capture this conditional surface. |
| app.system.error | 768 | token-only | UNVERIFIED | — | — | — | ErrorPage consumes the canonical error-state pattern. No artificial failure was injected to capture this conditional surface. |
| app.system.error | 1024 | token-only | UNVERIFIED | — | — | — | ErrorPage consumes the canonical error-state pattern. No artificial failure was injected to capture this conditional surface. |
| app.system.error | 1440 | token-only | UNVERIFIED | — | — | — | ErrorPage consumes the canonical error-state pattern. No artificial failure was injected to capture this conditional surface. |
| app.system.loading | 375 | token-only | UNVERIFIED | — | — | — | After warming the lazy route, a real throttled uncached query demonstrates the owned token-backed skeleton without response mocks. |
| app.system.loading | 768 | token-only | UNVERIFIED | — | — | — | After warming the lazy route, a real throttled uncached query demonstrates the owned token-backed skeleton without response mocks. |
| app.system.loading | 1024 | token-only | UNVERIFIED | — | — | — | After warming the lazy route, a real throttled uncached query demonstrates the owned token-backed skeleton without response mocks. |
| app.system.loading | 1440 | token-only | UNVERIFIED | — | — | — | After warming the lazy route, a real throttled uncached query demonstrates the owned token-backed skeleton without response mocks. |
| app.system.not-found | 375 | token-only | UNVERIFIED | — | — | — | Naturally reachable 404 uses the canonical error-state pattern; no fault injection. |
| app.system.not-found | 768 | token-only | UNVERIFIED | — | — | — | Naturally reachable 404 uses the canonical error-state pattern; no fault injection. |
| app.system.not-found | 1024 | token-only | UNVERIFIED | — | — | — | Naturally reachable 404 uses the canonical error-state pattern; no fault injection. |
| app.system.not-found | 1440 | token-only | UNVERIFIED | — | — | — | Naturally reachable 404 uses the canonical error-state pattern; no fault injection. |
| app.system.privacy | 375 | token-only | UNVERIFIED | — | — | — | No canonical legal counterpart; canonical prose and responsive table tokens. |
| app.system.privacy | 768 | token-only | UNVERIFIED | — | — | — | No canonical legal counterpart; canonical prose and responsive table tokens. |
| app.system.privacy | 1024 | token-only | UNVERIFIED | — | — | — | No canonical legal counterpart; canonical prose and responsive table tokens. |
| app.system.privacy | 1440 | token-only | UNVERIFIED | — | — | — | No canonical legal counterpart; canonical prose and responsive table tokens. |
| app.system.terms | 375 | token-only | UNVERIFIED | — | — | — | No canonical legal counterpart; canonical 760px prose composition and tokens. |
| app.system.terms | 768 | token-only | UNVERIFIED | — | — | — | No canonical legal counterpart; canonical 760px prose composition and tokens. |
| app.system.terms | 1024 | token-only | UNVERIFIED | — | — | — | No canonical legal counterpart; canonical 760px prose composition and tokens. |
| app.system.terms | 1440 | token-only | UNVERIFIED | — | — | — | No canonical legal counterpart; canonical 760px prose composition and tokens. |
| app.system.toast | 375 | token-only | UNVERIFIED | — | — | — | Real guest bookmark action demonstrates canonical Radix toast presentation with unchanged li[data-state] contract. |
| app.system.toast | 768 | token-only | UNVERIFIED | — | — | — | Real guest bookmark action demonstrates canonical Radix toast presentation with unchanged li[data-state] contract. |
| app.system.toast | 1024 | token-only | UNVERIFIED | — | — | — | Real guest bookmark action demonstrates canonical Radix toast presentation with unchanged li[data-state] contract. |
| app.system.toast | 1440 | token-only | UNVERIFIED | — | — | — | Real guest bookmark action demonstrates canonical Radix toast presentation with unchanged li[data-state] contract. |
| app.tag | 375 | token-only | UNVERIFIED | — | — | — | The reference has no tag listing; verified through shared list-pattern tokens instead of pixels. |
| app.tag | 768 | token-only | UNVERIFIED | — | — | — | The reference has no tag listing; verified through shared list-pattern tokens instead of pixels. |
| app.tag | 1024 | token-only | UNVERIFIED | — | — | — | The reference has no tag listing; verified through shared list-pattern tokens instead of pixels. |
| app.tag | 1440 | token-only | UNVERIFIED | — | — | — | The reference has no tag listing; verified through shared list-pattern tokens instead of pixels. |
| artifact.anatomy.flows | 375 | artifact-docs | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.anatomy.flows | 768 | artifact-docs | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.anatomy.flows | 1024 | artifact-docs | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.anatomy.flows | 1440 | artifact-docs | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.a11y | 375 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.a11y | 768 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.a11y | 1024 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.a11y | 1440 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.buttons | 375 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.buttons | 768 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.buttons | 1024 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.buttons | 1440 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.cards | 375 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.cards | 768 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.cards | 1024 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.cards | 1440 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.checklist | 375 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.checklist | 768 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.checklist | 1024 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.checklist | 1440 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.color | 375 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.color | 768 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.color | 1024 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.color | 1440 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.data-density | 375 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.data-density | 768 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.data-density | 1024 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.data-density | 1440 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.flows | 375 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.flows | 768 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.flows | 1024 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.flows | 1440 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.forms | 375 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.forms | 768 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.forms | 1024 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.forms | 1440 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.getting-started | 375 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.getting-started | 768 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.getting-started | 1024 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.getting-started | 1440 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.integration | 375 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.integration | 768 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.integration | 1024 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.integration | 1440 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.lists | 375 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.lists | 768 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.lists | 1024 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.lists | 1440 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.motion | 375 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.motion | 768 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.motion | 1024 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.motion | 1440 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.navigation | 375 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.navigation | 768 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.navigation | 1024 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.navigation | 1440 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.overview | 375 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.overview | 768 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.overview | 1024 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.overview | 1440 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.pages | 375 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.pages | 768 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.pages | 1024 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.pages | 1440 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.principles | 375 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.principles | 768 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.principles | 1024 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.principles | 1440 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.spacing | 375 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.spacing | 768 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.spacing | 1024 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.spacing | 1440 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.theming | 375 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.theming | 768 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.theming | 1024 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.theming | 1440 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.theming-app | 375 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.theming-app | 768 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.theming-app | 1024 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.theming-app | 1440 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.tokens | 375 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.tokens | 768 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.tokens | 1024 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.tokens | 1440 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.typography | 375 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.typography | 768 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.typography | 1024 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.docs.typography | 1440 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.showcase | 375 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.showcase | 768 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.showcase | 1024 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |
| artifact.showcase | 1440 | pixel | INCOMPLETE | — | — | — | infrastructure failure: browser.newContext: Target page, context or browser has been closed |

## Font-face parity

Every executed row declared identical `@font-face` sets for the nine parity families.

## Reference adapter

Catalog snapshot `fbd78e1a95a65f39…` (9 categories, 1816 resources) bound to the design's `AV_*` globals; admin globals bound: AV_TOTAL_USERS, AV_USERS, AV_RECENT_ACTIVITY.

| File | Design literal | Served as | Source |
|---|---|---|---|
| home-layouts.jsx | `const recent = AV_RESOURCES.slice(0, 5);` | `const recent = [{"id":188015,"title":"srtdroid","cat":"protocols-transport","sub":"transport-protocols","subsub":"srt","desc":"Native Java/Kotlin SRT protocol implementation for Android mobile streaming applications","tags":[],"featured":false,"url":"https://github.com/ThibaultBee/srtdroid"},{"id":188014,"title":"SRT CookBook - Projects and Applications","cat":"protocols-transport","sub":"transport-protocols","subsub":"srt","desc":"Comprehensive curated directory of SRT-enabled projects and applications including VLC, FFmpeg, GStreamer, Wireshark, OBS Studio, and integration guides","tags":[],"featured":false,"url":"https://srtlab.github.io/srt-cookbook/apps/"},{"id":188013,"title":"HydraSRT","cat":"protocols-transport","sub":"transport-protocols","subsub":"srt","desc":"Open-source SRT gateway and relay tool with multi-protocol conversion capabilities (SRT to RTMP/HLS), alternative to commercial Haivision SRT Gateway","tags":[],"featured":false,"url":"https://github.com/abc3/hydra-srt"},{"id":188012,"title":"CTA-WAVE Device Playback Task Force","cat":"general-tools","sub":"drm-testing-validation-tools","subsub":null,"desc":"CTA-WAVE working group repository discussing commercial DRM test coverage for PlayReady, Widevine, and FairPlay across different security levels","tags":[],"featured":false,"url":"https://github.com/cta-wave/device-playback-task-force"},{"id":188011,"title":"DRMreview","cat":"general-tools","sub":"drm-testing-validation-tools","subsub":null,"desc":"Android application for checking DRM and HDCP security levels on mobile devices","tags":[],"featured":false,"url":"https://github.com/espio999/DRMreview"}];` | /api/home recent resources in approved/indexed order |
| home-layouts.jsx | `const recent = AV_RESOURCES.slice(6, 12);` | `const recent = [{"id":188015,"title":"srtdroid","cat":"protocols-transport","sub":"transport-protocols","subsub":"srt","desc":"Native Java/Kotlin SRT protocol implementation for Android mobile streaming applications","tags":[],"featured":false,"url":"https://github.com/ThibaultBee/srtdroid"},{"id":188014,"title":"SRT CookBook - Projects and Applications","cat":"protocols-transport","sub":"transport-protocols","subsub":"srt","desc":"Comprehensive curated directory of SRT-enabled projects and applications including VLC, FFmpeg, GStreamer, Wireshark, OBS Studio, and integration guides","tags":[],"featured":false,"url":"https://srtlab.github.io/srt-cookbook/apps/"},{"id":188013,"title":"HydraSRT","cat":"protocols-transport","sub":"transport-protocols","subsub":"srt","desc":"Open-source SRT gateway and relay tool with multi-protocol conversion capabilities (SRT to RTMP/HLS), alternative to commercial Haivision SRT Gateway","tags":[],"featured":false,"url":"https://github.com/abc3/hydra-srt"},{"id":188012,"title":"CTA-WAVE Device Playback Task Force","cat":"general-tools","sub":"drm-testing-validation-tools","subsub":null,"desc":"CTA-WAVE working group repository discussing commercial DRM test coverage for PlayReady, Widevine, and FairPlay across different security levels","tags":[],"featured":false,"url":"https://github.com/cta-wave/device-playback-task-force"},{"id":188011,"title":"DRMreview","cat":"general-tools","sub":"drm-testing-validation-tools","subsub":null,"desc":"Android application for checking DRM and HDCP security levels on mobile devices","tags":[],"featured":false,"url":"https://github.com/espio999/DRMreview"}];` | /api/home recent resources in approved/indexed order |
| home-layouts.jsx | `'+12 this week'` | `'+0 this week'` | /api/home approvedThisWeek (approvedAt with createdAt fallback) |
| home-layouts.jsx | `CURATED · WEEK 37 ·` | `CURATED · WEEK 38 ·` | ISO week of the frozen clock |
| home-layouts.jsx | `['CONTRIBUTORS', 3, 'reviewing']` | `['APPROVED THIS WEEK', 0, 'newly indexed']` | /api/home approvedThisWeek (approvedAt with createdAt fallback) |
| design-systems.jsx | `'--text-3': 'rgba(244,243,238,0.4)'` | `'--text-3': 'rgba(244,243,238,0.52)'` | approved expected-side Editorial AA contrast reconciliation (3.4:1 reference to 5.2:1 application) |
| admin.jsx | `sub="across 9 categories"` | `sub="across 9 categories"` | nav category count |
| admin.jsx | `sub="2 admins · 1 contributor"` | `sub="5 admins · 4 contributors"` | /api/admin/users roles (admin session only) |
| admin.jsx | `value="7" sub="oldest 14m ago"` | `value="0" sub="nothing waiting"` | /api/admin/stats pendingApprovals + oldest /api/admin/pending-resources createdAt vs frozen clock (admin session only) |
| home-layouts.jsx | `<button className="btn primary" onClick={() => go('submit')} style={{ width: '100%' }}>` | `<button className="btn primary" onClick={() => go('submit')} style={{ width: '100%', minHeight: 44 }}>` | User-approved Home Submit 44px minimum target reconciliation (2026-09-13) |
| home-layouts.jsx | `<button className="btn ghost" onClick={() => go('category', { cat: AV_CATEGORIES[1] })}>Browse all →</button>` | `<button className="btn ghost" style={{ minHeight: 44 }} onClick={() => go('category', { cat: AV_CATEGORIES[1] })}>Browse all →</button>` | User-approved Home Browse 44px minimum target reconciliation (2026-09-13) |
| home-layouts.jsx | `const kindCount = k => AV_RESOURCES.filter(k.match).length;` | `const kindCount = k => Number(window.AV_KIND_COUNTS?.[k.id] ?? AV_RESOURCES.filter(k.match).length);` | /api/resources/kinds/counts |
| home-layouts.jsx | `const featured = AV_RESOURCES.filter(r => r.featured).slice(0, 6);` | `const featured = (window.AV_HOME_FEATURED || AV_RESOURCES.filter(r => r.featured)).slice(0, 6);` | /api/home featured resource identities |
| home-layouts.jsx | `['FEATURED', AV_RESOURCES.filter(r => r.featured).length, 'hand-picked']` | `['FEATURED', Number(window.AV_HOME_FEATURED_COUNT ?? AV_RESOURCES.filter(r => r.featured).length), 'hand-picked']` | /api/home featuredCount |
| home-layouts.jsx | `['FEATURED', featured.length, 'this week']` | `['FEATURED', Number(window.AV_HOME_FEATURED_COUNT ?? featured.length), 'hand-picked']` | /api/home featuredCount and live curated stat label |
| home-layouts.jsx | `<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {featured.map((r, i) => <ResCard key={r.id} r={r} go={go} delay={i * 40} />)}
        </div>` | `{featured.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {featured.map((r, i) => <ResCard key={r.id} r={r} go={go} delay={i * 40} />)}
          </div>
        ) : (
          <p className="home-empty-section">No featured resources have been selected yet.</p>
        )}` | /api/home featured[] empty state |

## Capture contract

Chromium 148.0.7778.96; DPR 1; en-US; UTC; dark; reduced motion; viewport heights {"375":812,"768":1024,"1024":768,"1440":900}; pixelmatch threshold 0.1; includeAA false; ceiling 0.5% of the union canvas. Full-page captures; unequal sizes are compared on an unscaled union canvas where every unmatched pixel counts. No masking, no cropping, no post-processing. Normalisations applied to both sides: animations disabled; transitions disabled; caret hidden; backdrop-filter disabled on both sides (blur values compared via computed style); Chromium partial raster disabled (--disable-partial-raster): full-page capture re-rasters tiles per frame and reused tile content flipped single anti-aliased pixels between consecutive frames. Backdrop-filter values are compared per row via computed style before normalisation. Pre-seeded state: theme editorial × crimson on both sides; app localStorage {"ds-system":"editorial","ds-accent":"crimson","analytics-consent":"denied"}.

Determinism proof (standalone `--determinism 3` run `2026-09-12T23-21-07-982Z-38222`, reference side): 3 row/width cells captured 3 times each in fresh contexts — all 3 cells byte-identical (see [determinism.json](../../../../docs/parity/evidence/harness/determinism/determinism.json)).

Recoveries: no rate-limit waits; no deferrals; no document reloads or font-readiness reopens. Every event is listed in results.json under `configuration`.

Machine-readable result: [results.json](/results.json); output hashes: OUTPUT-MANIFEST.json. The reference was served from an in-memory snapshot on an ephemeral loopback port; awesome-list-site-ds/ was not modified (raw and served hashes are both recorded).

Inputs changed during run: YES — stale. Live catalog/admin adapter hashes were re-read after the final row, but the re-read was incomplete: page.evaluate: Target page, context or browser has been closed; 0 comparisons needed more than one raw frame before two consecutive frames were byte-identical; every attempt is retained.
