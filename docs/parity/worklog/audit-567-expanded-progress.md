# Expanded audit scope — still incomplete

The user authorized completing cross-cutting fixes, not weakening acceptance.
The frozen reference and pixel thresholds remain unchanged.

## Implemented

- Home nav now uses a smaller projection. The real database comparison was
  byte-equal for 1,816 resources and nine categories. Measured old/new loader
  timings were 402.22/27.48 ms; see the performance-projection evidence.
  This is not proof that Lighthouse meets its budget.
- Admin reference bindings use the live UI pagination and pending queue,
  including an empty pending queue. Frozen files were not edited.
- Expected-only retained extensions now independently project all seven
  source-backed About sections (maintainer, open source, features, technology,
  accessibility, credits, and FAQ) and the known failing Approvals and Audit
  admin surfaces. The projections use frozen design tokens, semantic DOM, and
  read-only adapter data; they do not import application rendering or CSS.
- About, approvals, audit, and canonical admin source contracts are hashed and
  checked before projection. Contract drift fails closed. Audit now also binds
  the real contact-inbox response so unavailable and empty states remain
  explicit rather than guessed.
- ChipButton hook ownership is documented in both canonical documents.
- Decorative Home icons, routine overview actor labels, and the taxonomy
  resource-count badge no longer use accent emphasis.

## Current measurements

Evidence is retained under `../evidence/audit-567-expanded/`.

Commands:

```sh
npm run build
npx esbuild scripts/validation/audit-567-compiled-server.ts --bundle --platform=node --packages=external --format=esm --outfile=dist/audit-567-server.mjs
NODE_ENV=production node dist/audit-567-server.mjs
node --import dotenv/config scripts/validation/production-baseline-capture.mjs --base http://127.0.0.1:5101 --only lighthouse --lighthouse-routes /,/category/encoding-codecs,/resource/185020 --out /tmp/audit-567-expanded-lighthouse --trace-summary
AUDIT_567_STATES_OUT=/tmp/audit-567-expanded-states node --import dotenv/config scripts/validation/audit-567-states.mjs
```

Build passed. Lighthouse scores were **59/47/69**, all below the unchanged
**88/73/77** floors. These use the previously documented audit-only server,
not an equivalent deployment composition. The trace records blocked Clerk
development-browser initialization. No performance acceptance is claimed.
The requested `perf:mobile` command is a separate CDP measurement runner,
not Lighthouse; it remains to be run.

The last completed state run returned **14 PASS, 8 BLOCKED, 2 FAIL**. A
focused browser diagnosis was then run only for consent and toast at 375px and
1440px; it did not run the full suite or any other state. The staged evidence
is under `/tmp/audit-567-focused-diagnosis`.

The consent banner itself had no serious/critical findings in a banner-scoped
axe pass. The prior full-page contrast failures were Home stat/category nodes
sampled during the progressive `.home-page` entrance animation, before the
settled page colors were present; they were not consent-banner contrast
defects. The runner now waits for real Home stat content and all finite Home
entrance animations before retaining its full-page axe result.

The genuine guest bookmark flow is a one-click on-device save: it does not
open the authenticated notes dialog. The shipped toast identity is the exact
title **“Saved on this device”**, followed by the sign-in action and the
device-save description. The runner now asserts that title instead of waiting
for the authed-only notes controls.

The runner also asserts shipped component identity: the Advanced route
pathname, ErrorPage's `Error` / `Something went wrong`, NotFound's
`Error · 404` / `Page Not Found`, RouteErrorBoundary's exact offline heading,
and the design-system page's `Design System` title. These runner corrections
are **not yet reverified**. Lazy route loading still warms only the shell,
then uses normal UI navigation under a real CDP throttle and waits for the
shipped fallback instead of checking `isVisible()` immediately. ErrorPage is
exercised through a browser-level request abort, and RouteErrorBoundary
through a real offline lazy-chunk failure; both restore network conditions in
`finally`.

The state runner now accepts targeted reruns without provisioning the
disposable owner identity, for example:

```sh
AUDIT_567_STATES_OUT=/tmp/audit-567-targeted-states \
node scripts/validation/audit-567-states.mjs \
  --states consent,toast,loading,error --width 375,1440
```

Per-screen state rows (including retained axe violations/incomplete evidence)
are written under `OUT/axe`; the aggregate remains
`OUT/axe/audit-567-summary.json`. The focused diagnosis was observational;
the corrected runner itself has not yet been rerun.

The owned collection and local/Clerk identity were deleted successfully.
One unrelated QA identity remained and was deliberately not removed.

All six static commands exited zero:

```sh
node scripts/validation/palette-drift.mjs
node scripts/validation/accent-drift.mjs
node scripts/validation/standalone-palette-drift.mjs
node scripts/validation/canonical-token-parity.mjs
npm run validate:webfont-fetch
npm run validate:theme-registry-types
```

The application restarted successfully and the preview rendered Home and
the consent banner. This is a smoke observation, not pixel acceptance.

## Remaining acceptance work

- Browser parity verification of the new independent About/admin projections;
  no browser run has been performed for this implementation.
- Reverify controlled failure coverage for ErrorPage and RouteErrorBoundary,
  corrected consent/toast scenarios, lazy loading, and accent classification.
- Resolve performance regressions, run the requested mobile command, complete
  the 55-cell aggregate audit, and run the final unchanged pixel gate.
- Regenerate artifact documentation after the canonical documentation change.

No complete-task, all-green, or publish verdict is made.