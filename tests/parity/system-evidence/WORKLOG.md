# System surfaces — owned implementation and integration handoff

## Delivered

- Legal content is unchanged, with a 760px reading column, token-backed prose/cards, responsive privacy table and retained route/test-ID contracts.
- `system.css` owns error/404 composition and showcase layout. Companion `system-legal.css` and `system-overlays.css` are scoped, locally imported stylesheets; no App, shell, aggregate inventory/report, frozen source, analytics or server edits.
- ErrorPage keeps manual reload behavior; the external reload guards are untouched. Natural unknown routes still return HTTP 404 with `Cache-Control: no-store`.
- Consent retains its state machine, storage, Escape/reopen/focus handling, mobile flow, desktop sticky positioning and inset hook. Buttons and surface use canonical tokens.
- Radix toasts retain `li[data-state]`, timing and actionable-toast persistence. Destructive background and foreground explicitly use the existing paired tokens.
- Skeleton primitive remains aria-hidden and layout-neutral; presentation uses token-backed shimmer with reduced-motion handling. No standalone empty-state or Sonner component exists in this checkout.
- The app showcase still resolves actual live tokens and imports shipping components. Faint ink is now shown as a decorative swatch beside a readable caption, rather than unreadable body text.

## Evidence

Root: `task-554-editorial-crimson-20260913-0530/` relative to this file.

- `screenshots/`: legal ×3, natural 404, natural empty search, home/submit context at 375/768/1024/1440.
- `latest/`: authoritative post-fix showcase, consent on home/submit, real bookmark toast and real network-throttled loading/replacement at all four widths.
- `axe/` and `axe-focused/`: legal/404/empty/showcase/consent/toast have zero serious/critical findings at 375/1440 after the showcase correction. The corrected owned-loading capture also has zero serious/critical findings; earlier shared-fallback findings remain a separate handoff below.
- `flows/`: real accept/decline persistence and bookmark add/remove evidence. No external analytics requests before consent. No primary-CTA intersection at 375 on `/` or `/submit`.
- `comparison/`, `testid-diff-concise.json`: dated production comparisons and test-ID differences. New prose spacing, state composition and token surface changes are intentional; shell/sidebar/catalog differences belong to integration. These token-only surfaces are **not** claimed to pass a pixel gate. Keep threshold 0.1 / maximum 0.5% union-canvas differences unchanged for pixel-eligible surfaces.
- Personally inspected mobile Terms, 404, consent/submit, bookmark toast, desktop Privacy, and the running Terms preview. Layout is readable and mobile controls remain inside the viewport.

## Checks

| Check | Result |
| --- | --- |
| `npm run check` | PASS after final source edits |
| `npm run lint:css` | PASS after final CSS edits |
| `npm run test:unit` | PASS: 15 files, 300 tests |
| `npm run lint -- --format json` | FAIL, existing debt; per-owned-file comparison against HEAD has no new errors/rules (not-found removes one unused import) |
| `design-system-showcase.mjs` | PASS: 20/20; only subsequent showcase change was readable specimen copy/swatch, with focused axe and captures afterward |
| `print-audit.mjs` | PASS: 49/49 |
| `dead-components.mjs` | FAIL: unreachable `client/src/components/layout/new/AppFooter.tsx`, untouched shell ownership |
| `bundle:budget` | PASS against existing dist; **not** fresh-build proof |
| `ds-button-sweep.mjs` | NOT GREEN: partial attempt timed out at 300 seconds; admin headings/legacy tab selectors fail outside scope; retained log |
| 404 HTTP/header check | PASS: 404, no redirect, no-store; server unchanged |
| `git diff --check` | PASS |
| Full `test:e2e`, responsive-audit, SEO parity gate, fresh build/budget, full cache-header suite | Deferred to merged integration/final regression per parallel execution contract; not reported green |

Shell-check logs live in `checks/`; browser gate logs live in the dated evidence root's `gates/`.

## Required integration handoffs — not waived acceptance

1. **Shared route fallback and discovery loading/empty composition:** `Search.tsx` owns the real empty/search-loading container, but the focused axe report targets `.space-y-6`. Source inspection locates the prohibited label on the generic `div[data-testid="route-chunk-skeleton"][aria-label="Loading page"]` in `App.tsx`, not on the Search results main. The worker's preliminary attribution to Search.tsx:242 in the raw summary is not established by its reduced axe output and is superseded by this handoff. Integrator should give the shared fallback an appropriate semantic role. That route-fallback capture is superseded for loading-state evidence: the authoritative correction in `task-554-editorial-crimson-20260913-0530/latest/loading-owned/` warms `/search?q=zzqxv-nothing`, captures a real `Search.tsx:242` `search-results-loading` state with 36 `.system-skeleton` descendants and zero route-chunk fallback nodes at all four widths, then replaces it with 24 `ffmpeg` content cards. Focused axe serious/critical is 0 at 375/1440. The measured incremental CLS and main-height changes are retained there; this is **not zero-shift acceptance**. No category was emptied to fabricate a state.
2. **Shared SEOHead foundation:** this checkout lacks `titleTestId` support. Add optional `titleTestId?: string` and forward it onto the Helmet `<title>` in the shared foundation; current legal title/description and visible heading test IDs are preserved. This leaf does not change shared SEOHead.
3. **Shell/footer and admin integration:** resolve dead AppFooter reachability and the `Operations dashboard` heading/legacy tab selectors reported by the button sweep. Preserve intended token hooks; do not relax the gate. Higher-width consent intersections are recorded in `latest/consent-metrics.json` for merged shell review; the explicit 375 requirement passes.
4. **Inventory integration:** `inventory/token-only-system.json` is a new owned fragment, not an aggregate rewrite. Reconcile legacy `app.legal` and blocked `app.design-system` rows in `static.json` when consolidating. Keep registered artifact eligibility separate. Do not call an eligibility designation a passing validation result.
5. **Whole-page regression:** resolve retained shell/nav/catalog test-ID differences against production, run outstanding whole-page gates on the merged tree, and retain original pixel thresholds. Global command palette/drawer chrome belongs to its parallel owners, not this stylesheet.
6. **Timed-out legacy gate fixture cleanup:** the button sweep confirms its guest-user teardown passed. Completion evidence supplied the exact admin suffix `1789276853708_1a1xzr`; exact parameterized checks for its pending resource URL and empty category name/slug returned zero rows before and after `DELETE 0`. The persistent gate admin was left untouched; no broad cleanup or other-worker mutation was attempted. See `latest/loading-owned/admin-fixture-cleanup.json`.

No publishing, fault injection, shared-token redefinition or analytics behavior changes were performed.

## Completion validation update

The configured whole-repository run also passed fresh build, HTTP cache headers, responsive audit, print, and the showcase gate. It failed tablet consent/footer clearance, dead footer component/export, resource-page canonical chip shadows, admin button-sweep selectors, and SEO on the transient admin-fixture category. These are documented integration dependencies, not passing gates. Exact fixture checks now confirm that category/resource is absent.

The review-required loading correction proves the **owned** primitives at every width, with zero serious/critical axe findings and actual content replacement. Full-page incremental CLS remains 0.07444–0.09008 (not zero), because the discovery page replaces six placeholders with 24 variable-height content cards. Final zero-shift closure requires the discovery/resource owners to agree on count and layout reservation; this leaf neither edits those pages nor silently loosens that requirement.

The header evidence is now LF-normalized, and `git diff --check` was rerun after normalization. Existing screenshots, raw pre-correction metrics and failing reports are retained for provenance; `latest/loading-owned/` is authoritative for the owned loading state.