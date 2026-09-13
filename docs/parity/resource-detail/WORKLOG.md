# Resource detail — owned implementation and integration handoff

## Scope and outcome

ResourceDetail and `client/src/styles/pages/resource.css` only. No shared
card, shell, footer, palette, backend, frozen source, or aggregate inventory
edits. The design-system artifact's docs directory is empty in this checkout;
the frozen ResourcePage and existing app token bridge supplied the reference.

The page now has an 880px maximum column, Back, RESOURCE · DETAIL, the
canonical body-font heading (28–44px, 700, -1.2px tracking, 1.1 leading),
200px shimmer, linked taxonomy chips, optional featured chip, server
resolvedKind chip, description, primary outbound action, secondary actions,
and mono-labelled metadata. All existing test IDs remain. Tag anchors,
bookmark notes/collections, favorite, share, suggest-edit, contact-variant
fallback and admin edit remain. Both outbound anchors use the existing
consent-gated resource-click/outbound analytics helper; target and rel remain.

Related recommendations intentionally retain their existing cards, match
scores, reasons, anchor behavior and tracking until the taxonomy card work is
integrated. No speculative import of another worker's unfinished card API.
SEOHead and server JSON-LD/soft-404 paths were not changed.

## Verified results

Evidence: `tests/parity/resource-detail-evidence/`.

- TypeScript check and CSS lint: pass.
- Unit suite: 15 files / 299 tests pass.
- Resource-detail + favorites E2E: 52 Chromium tests pass. These existing
  specs have conditional authenticated assertions; they are supplemented by
  the real-user journey below, not treated as proof of authentication.
- Responsive audit: 32 checks, zero failures.
- SEO snapshot `--gate --parity`: pass, zero failure codes.
- Dead-components: pass, 199 reachable in-scope files.
- Full lint: pre-existing baseline is not green (5,573 errors, 23 warnings).
  ResourceDetail specifically decreases from 31 errors / 2 warnings at HEAD
  to 29 errors / 2 warnings; no lint exception or rule relaxation.
- Print audit: initially 48/49 because its generic `header` selector also
  counted the new content header. Changed the content wrapper to the
  canonical div. Targeted real print-media check confirms the sole chrome
  header is display:none, resource heading stays visible, and column is 880.
- Real signed-in journey: favorite and bookmark+notes persist reload;
  suggest-edit prefill and submission succeed; Escape removes the dialog
  with body pointer-events:auto; unknown ID gets document 404 and explicit
  not-found UI. Taxonomy and tag ancestor anchors are correct.
- Axe: zero violations at 375 and 1440, closed and suggest-edit open.
  Some incomplete/manual-review nodes remain; not claimed as passes.
- Lighthouse mobile resource score: 81 vs retained production 74
  (accessibility 100, best-practices 96, SEO 100). This run preceded the
  final heading-font correction; final merged performance remains a gate.
- Final anonymous screenshots and closed-state axe exist for both resource
  185020 and 186190 at 375/768/1024/1440.
- Final outbound check grants consent through the real UI and clicks Open
  resource: the real analytics dataLayer receives both `resource_click`
  and `outbound_link`. No analytics mock or transport substitution.

## Pixel gate: NOT CLOSED

Eligibility remains **pixel**. No masking, cropping, token-only downgrade,
threshold relaxation or passing full-page claim.

The first reference-adapter run used the real record and produced all four
full-union comparisons at threshold 0.1:

| Width | Different pixels | Percent |
|---|---:|---:|
| 375 | 369479 | 35.2010 |
| 768 | 758285 | 40.0873 |
| 1024 | 1387561 | 53.5377 |
| 1440 | 1668861 | 49.2115 |

That run reached all cells but exceeded the shell budget before publishing
its report. Its staged expected/actual/repeat/diff PNGs are retained.
After correcting the heading font, a bounded follow-up run measured
375 = 369146 / 35.1693% and 768 = 757767 / 40.0599%, then was stopped
while processing 1024. These are **visitor evidence**, not the authenticated
parity gate. Do not represent either run as a complete final two-pass gate.

The reference omits the required primary action, save/share/edit controls,
kind/subtaxonomy, classification facts, dates and related recommendations.
The app shell/sidebar/footer also still differ substantially. Integrator:
resolve these as documented two-pass residuals, integrate the shared card,
and rerun the unchanged <0.5% full-union acceptance at all four widths with
the required identity. The aggregate adapter/inventory remains untouched.

## Production comparison (retained 2026-09-12 baseline, no publishing)

Full-union threshold 0.1, no masking/cropping, final layout screenshots:

| Resource | Width | Difference |
|---|---:|---:|
| 185020 | 375 | 14.3856% |
| 185020 | 1440 | 47.0346% |
| 186190 | 375 | 14.9337% |
| 186190 | 1440 | 40.3391% |

Intended changes: canonical heading/chips/description and action placement,
880px one-column metadata and below-content recommendations rather than
the previous two-column detail card. Shared navigation/footer differences
must be reconciled by their owners, not counted as page-level success.

## Existing functional gaps for integration/final visitor regression

1. Immediately after Clerk sign-in, the mounted favorite control can still
   show a sign-in toast until reload; persistence succeeds after reload.
2. Suggest-edit Escape closes without a pointer lock, but focus does not
   reliably return to its trigger. Shared dialog implementation unchanged.
3. Withdrawing this run's pending contribution returned 409 while the UI
   still showed Pending. No backend fix was made in this page-only scope.
   Clerk identity was deleted and verified absent. Then the existing local
   UserRepository cleanup was called for ONLY the exact owned disposable
   identity, guarded by its unique QA prefix: one edit removed, zero public
   resources detached, local user verified absent. No other worker's data
   was swept. The tester's initial cleanup-blocked report is superseded by
   `cleanup.log`.

No duplicate follow-up task is proposed: the already-planned integration
and visitor/admin regression tasks own these handoffs and final gate closure.