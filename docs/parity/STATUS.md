# Parity status

Latest baseline run: `2026-09-17T11-42-39-272Z-11572` (2026-09-17T11:42:39.272Z) — gate **NOT PASSED**.

Compared pixel rows: 133 pass, 51 fail, 0 incomplete of 184.

Additional coverage: 40 blocked, 100 unverified, 4 aliases, 4 evidence-only rows. These do not inflate the compared-pixel denominator. Eligibility: {"pixel":47,"token-only":25,"artifact-docs":1,"blocked":10}.

## Largest measured gaps

| Screen | Width | Diff % | Reason |
|---|---:|---:|---|
| artifact.docs.integration | 375 | 66.5333% | 66.533% differing pixels exceeds the 0.5% ceiling |
| artifact.showcase | 375 | 62.5834% | 62.583% differing pixels exceeds the 0.5% ceiling |
| artifact.docs.theming | 375 | 43.1589% | 43.159% differing pixels exceeds the 0.5% ceiling |
| app.subcategory | 768 | 32.6815% | 32.682% differing pixels exceeds the 0.5% ceiling |
| app.category | 768 | 31.5450% | 31.545% differing pixels exceeds the 0.5% ceiling |
| artifact.docs.flows | 375 | 29.4952% | 29.495% differing pixels exceeds the 0.5% ceiling |
| artifact.docs.motion | 375 | 26.6253% | 26.625% differing pixels exceeds the 0.5% ceiling |
| app.home.index | 768 | 25.5507% | 25.551% differing pixels exceeds the 0.5% ceiling |
| app.shell.mobile-drawer | 768 | 25.3288% | 25.329% differing pixels exceeds the 0.5% ceiling |
| app.home.curated | 768 | 25.2954% | 25.295% differing pixels exceeds the 0.5% ceiling |

## Blocked rows

- app.advanced@375: No independently configured active-reference state exists for advanced search.
- app.advanced@768: No independently configured active-reference state exists for advanced search.
- app.advanced@1024: No independently configured active-reference state exists for advanced search.
- app.advanced@1440: No independently configured active-reference state exists for advanced search.
- app.auth.sign-in@375: Sign-in is Clerk's hosted component; the reference has no sign-in screen and no auth fixture is permitted.
- app.auth.sign-in@768: Sign-in is Clerk's hosted component; the reference has no sign-in screen and no auth fixture is permitted.
- app.auth.sign-in@1024: Sign-in is Clerk's hosted component; the reference has no sign-in screen and no auth fixture is permitted.
- app.auth.sign-in@1440: Sign-in is Clerk's hosted component; the reference has no sign-in screen and no auth fixture is permitted.
- app.auth.sign-up@375: Sign-up is Clerk's hosted component (captcha-gated); the reference has no sign-up screen.
- app.auth.sign-up@768: Sign-up is Clerk's hosted component (captcha-gated); the reference has no sign-up screen.
- app.auth.sign-up@1024: Sign-up is Clerk's hosted component (captcha-gated); the reference has no sign-up screen.
- app.auth.sign-up@1440: Sign-up is Clerk's hosted component (captcha-gated); the reference has no sign-up screen.
- app.categories@375: No independently configured active-reference state exists for the all-categories page.
- app.categories@768: No independently configured active-reference state exists for the all-categories page.
- app.categories@1024: No independently configured active-reference state exists for the all-categories page.
- app.categories@1440: No independently configured active-reference state exists for the all-categories page.
- app.journey-detail@375: A real journey identity has not been aligned with the reference.
- app.journey-detail@768: A real journey identity has not been aligned with the reference.
- app.journey-detail@1024: A real journey identity has not been aligned with the reference.
- app.journey-detail@1440: A real journey identity has not been aligned with the reference.
- app.journeys@375: No independently configured active-reference state exists for journeys.
- app.journeys@768: No independently configured active-reference state exists for journeys.
- app.journeys@1024: No independently configured active-reference state exists for journeys.
- app.journeys@1440: No independently configured active-reference state exists for journeys.
- app.not-found@375: The active modular reference does not expose a 404 state.
- app.not-found@768: The active modular reference does not expose a 404 state.
- app.not-found@1024: The active modular reference does not expose a 404 state.
- app.not-found@1440: The active modular reference does not expose a 404 state.
- app.search@375: The modular reference has no independently routeable search-results state; the command palette row (app.shell.palette) covers the search affordance.
- app.search@768: The modular reference has no independently routeable search-results state; the command palette row (app.shell.palette) covers the search affordance.
- app.search@1024: The modular reference has no independently routeable search-results state; the command palette row (app.shell.palette) covers the search affordance.
- app.search@1440: The modular reference has no independently routeable search-results state; the command palette row (app.shell.palette) covers the search affordance.
- app.settings@375: No independently configured active-reference state exists for settings.
- app.settings@768: No independently configured active-reference state exists for settings.
- app.settings@1024: No independently configured active-reference state exists for settings.
- app.settings@1440: No independently configured active-reference state exists for settings.
- app.settings.theme@375: The theme picker's counterpart is the tweaks panel, which is a host overlay rather than a routeable reference page.
- app.settings.theme@768: The theme picker's counterpart is the tweaks panel, which is a host overlay rather than a routeable reference page.
- app.settings.theme@1024: The theme picker's counterpart is the tweaks panel, which is a host overlay rather than a routeable reference page.
- app.settings.theme@1440: The theme picker's counterpart is the tweaks panel, which is a host overlay rather than a routeable reference page.

## Unverified rows

- app.admin.digests@375: App tab "Digests" has no design counterpart tab in ADMIN_TABS; verified through table and form tokens.
- app.admin.digests@768: App tab "Digests" has no design counterpart tab in ADMIN_TABS; verified through table and form tokens.
- app.admin.digests@1024: App tab "Digests" has no design counterpart tab in ADMIN_TABS; verified through table and form tokens.
- app.admin.digests@1440: App tab "Digests" has no design counterpart tab in ADMIN_TABS; verified through table and form tokens.
- app.admin.journeys@375: App tab "Journeys" has no design counterpart tab in ADMIN_TABS; verified through table and form tokens.
- app.admin.journeys@768: App tab "Journeys" has no design counterpart tab in ADMIN_TABS; verified through table and form tokens.
- app.admin.journeys@1024: App tab "Journeys" has no design counterpart tab in ADMIN_TABS; verified through table and form tokens.
- app.admin.journeys@1440: App tab "Journeys" has no design counterpart tab in ADMIN_TABS; verified through table and form tokens.
- app.admin.subsubcategories@375: App tab "Sub-subcategories" has no design counterpart tab in ADMIN_TABS; verified through table and form tokens.
- app.admin.subsubcategories@768: App tab "Sub-subcategories" has no design counterpart tab in ADMIN_TABS; verified through table and form tokens.
- app.admin.subsubcategories@1024: App tab "Sub-subcategories" has no design counterpart tab in ADMIN_TABS; verified through table and form tokens.
- app.admin.subsubcategories@1440: App tab "Sub-subcategories" has no design counterpart tab in ADMIN_TABS; verified through table and form tokens.
- app.bookmarks@375: The reference has no bookmarks page; verified through list-pattern tokens.
- app.bookmarks@768: The reference has no bookmarks page; verified through list-pattern tokens.
- app.bookmarks@1024: The reference has no bookmarks page; verified through list-pattern tokens.
- app.bookmarks@1440: The reference has no bookmarks page; verified through list-pattern tokens.
- app.collection@375: The reference has no collection page; verified through shared list-pattern tokens instead of pixels.
- app.collection@768: The reference has no collection page; verified through shared list-pattern tokens instead of pixels.
- app.collection@1024: The reference has no collection page; verified through shared list-pattern tokens instead of pixels.
- app.collection@1440: The reference has no collection page; verified through shared list-pattern tokens instead of pixels.
- app.contributions@375: The reference has no contributions page; verified through table tokens.
- app.contributions@768: The reference has no contributions page; verified through table tokens.
- app.contributions@1024: The reference has no contributions page; verified through table tokens.
- app.contributions@1440: The reference has no contributions page; verified through table tokens.
- app.error.empty@375: Empty states need an empty catalog slice; verified through empty-state tokens, not pixels.
- app.error.empty@768: Empty states need an empty catalog slice; verified through empty-state tokens, not pixels.
- app.error.empty@1024: Empty states need an empty catalog slice; verified through empty-state tokens, not pixels.
- app.error.empty@1440: Empty states need an empty catalog slice; verified through empty-state tokens, not pixels.
- app.error.loading@375: Loading skeletons are transient; verified through skeleton tokens, not pixels.
- app.error.loading@768: Loading skeletons are transient; verified through skeleton tokens, not pixels.
- app.error.loading@1024: Loading skeletons are transient; verified through skeleton tokens, not pixels.
- app.error.loading@1440: Loading skeletons are transient; verified through skeleton tokens, not pixels.
- app.error.route@375: Error injection is prohibited; no naturally occurring real error state is supplied.
- app.error.route@768: Error injection is prohibited; no naturally occurring real error state is supplied.
- app.error.route@1024: Error injection is prohibited; no naturally occurring real error state is supplied.
- app.error.route@1440: Error injection is prohibited; no naturally occurring real error state is supplied.
- app.legal@375: The reference has no legal pages; verified through prose tokens instead of pixels.
- app.legal@768: The reference has no legal pages; verified through prose tokens instead of pixels.
- app.legal@1024: The reference has no legal pages; verified through prose tokens instead of pixels.
- app.legal@1440: The reference has no legal pages; verified through prose tokens instead of pixels.
- app.notifications@375: The reference has no notifications page; verified through list-pattern tokens.
- app.notifications@768: The reference has no notifications page; verified through list-pattern tokens.
- app.notifications@1024: The reference has no notifications page; verified through list-pattern tokens.
- app.notifications@1440: The reference has no notifications page; verified through list-pattern tokens.
- app.onboarding@375: The reference has no onboarding flow; verified through form tokens.
- app.onboarding@768: The reference has no onboarding flow; verified through form tokens.
- app.onboarding@1024: The reference has no onboarding flow; verified through form tokens.
- app.onboarding@1440: The reference has no onboarding flow; verified through form tokens.
- app.profile@375: The reference has no profile page; verified through form and card tokens.
- app.profile@768: The reference has no profile page; verified through form and card tokens.
- app.profile@1024: The reference has no profile page; verified through form and card tokens.
- app.profile@1440: The reference has no profile page; verified through form and card tokens.
- app.subsubcategory@375: The frozen prototype has no third-level page: __avGo('subcategory', {cat, sub, subSub}) renders the PARENT subcategory's heading, count and resources. The application keeps the leaf's own heading and resources (a feature the prototype never designed), so this route has no pixel counterpart and is verified through the shared taxonomy tokens instead.
- app.subsubcategory@768: The frozen prototype has no third-level page: __avGo('subcategory', {cat, sub, subSub}) renders the PARENT subcategory's heading, count and resources. The application keeps the leaf's own heading and resources (a feature the prototype never designed), so this route has no pixel counterpart and is verified through the shared taxonomy tokens instead.
- app.subsubcategory@1024: The frozen prototype has no third-level page: __avGo('subcategory', {cat, sub, subSub}) renders the PARENT subcategory's heading, count and resources. The application keeps the leaf's own heading and resources (a feature the prototype never designed), so this route has no pixel counterpart and is verified through the shared taxonomy tokens instead.
- app.subsubcategory@1440: The frozen prototype has no third-level page: __avGo('subcategory', {cat, sub, subSub}) renders the PARENT subcategory's heading, count and resources. The application keeps the leaf's own heading and resources (a feature the prototype never designed), so this route has no pixel counterpart and is verified through the shared taxonomy tokens instead.
- app.system.code-of-conduct@375: No canonical legal counterpart; canonical 760px prose composition and tokens.
- app.system.code-of-conduct@768: No canonical legal counterpart; canonical 760px prose composition and tokens.
- app.system.code-of-conduct@1024: No canonical legal counterpart; canonical 760px prose composition and tokens.
- app.system.code-of-conduct@1440: No canonical legal counterpart; canonical 760px prose composition and tokens.
- app.system.consent@375: Global consent uses canonical surface/button tokens and retains analytics gating and in-flow mobile behavior.
- app.system.consent@768: Global consent uses canonical surface/button tokens and retains analytics gating and in-flow mobile behavior.
- app.system.consent@1024: Global consent uses canonical surface/button tokens and retains analytics gating and in-flow mobile behavior.
- app.system.consent@1440: Global consent uses canonical surface/button tokens and retains analytics gating and in-flow mobile behavior.
- app.system.design-system@375: Internal live-token/component reference is distinct from the registered artifact and has no canonical page counterpart.
- app.system.design-system@768: Internal live-token/component reference is distinct from the registered artifact and has no canonical page counterpart.
- app.system.design-system@1024: Internal live-token/component reference is distinct from the registered artifact and has no canonical page counterpart.
- app.system.design-system@1440: Internal live-token/component reference is distinct from the registered artifact and has no canonical page counterpart.
- app.system.empty-search@375: A real zero-result query supplies natural empty-state evidence; page composition belongs to discovery integration.
- app.system.empty-search@768: A real zero-result query supplies natural empty-state evidence; page composition belongs to discovery integration.
- app.system.empty-search@1024: A real zero-result query supplies natural empty-state evidence; page composition belongs to discovery integration.
- app.system.empty-search@1440: A real zero-result query supplies natural empty-state evidence; page composition belongs to discovery integration.
- app.system.error@375: ErrorPage consumes the canonical error-state pattern. No artificial failure was injected to capture this conditional surface.
- app.system.error@768: ErrorPage consumes the canonical error-state pattern. No artificial failure was injected to capture this conditional surface.
- app.system.error@1024: ErrorPage consumes the canonical error-state pattern. No artificial failure was injected to capture this conditional surface.
- app.system.error@1440: ErrorPage consumes the canonical error-state pattern. No artificial failure was injected to capture this conditional surface.
- app.system.loading@375: After warming the lazy route, a real throttled uncached query demonstrates the owned token-backed skeleton without response mocks.
- app.system.loading@768: After warming the lazy route, a real throttled uncached query demonstrates the owned token-backed skeleton without response mocks.
- app.system.loading@1024: After warming the lazy route, a real throttled uncached query demonstrates the owned token-backed skeleton without response mocks.
- app.system.loading@1440: After warming the lazy route, a real throttled uncached query demonstrates the owned token-backed skeleton without response mocks.
- app.system.not-found@375: Naturally reachable 404 uses the canonical error-state pattern; no fault injection.
- app.system.not-found@768: Naturally reachable 404 uses the canonical error-state pattern; no fault injection.
- app.system.not-found@1024: Naturally reachable 404 uses the canonical error-state pattern; no fault injection.
- app.system.not-found@1440: Naturally reachable 404 uses the canonical error-state pattern; no fault injection.
- app.system.privacy@375: No canonical legal counterpart; canonical prose and responsive table tokens.
- app.system.privacy@768: No canonical legal counterpart; canonical prose and responsive table tokens.
- app.system.privacy@1024: No canonical legal counterpart; canonical prose and responsive table tokens.
- app.system.privacy@1440: No canonical legal counterpart; canonical prose and responsive table tokens.
- app.system.terms@375: No canonical legal counterpart; canonical 760px prose composition and tokens.
- app.system.terms@768: No canonical legal counterpart; canonical 760px prose composition and tokens.
- app.system.terms@1024: No canonical legal counterpart; canonical 760px prose composition and tokens.
- app.system.terms@1440: No canonical legal counterpart; canonical 760px prose composition and tokens.
- app.system.toast@375: Real guest bookmark action demonstrates canonical Radix toast presentation with unchanged li[data-state] contract.
- app.system.toast@768: Real guest bookmark action demonstrates canonical Radix toast presentation with unchanged li[data-state] contract.
- app.system.toast@1024: Real guest bookmark action demonstrates canonical Radix toast presentation with unchanged li[data-state] contract.
- app.system.toast@1440: Real guest bookmark action demonstrates canonical Radix toast presentation with unchanged li[data-state] contract.
- app.tag@375: The reference has no tag listing; verified through shared list-pattern tokens instead of pixels.
- app.tag@768: The reference has no tag listing; verified through shared list-pattern tokens instead of pixels.
- app.tag@1024: The reference has no tag listing; verified through shared list-pattern tokens instead of pixels.
- app.tag@1440: The reference has no tag listing; verified through shared list-pattern tokens instead of pixels.

## Incomplete rows

- none

See [REPORT.md](REPORT.md) for every row and the evidence links.
