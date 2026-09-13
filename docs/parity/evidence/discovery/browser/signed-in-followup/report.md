# Task 553 signed-in / shared-collection follow-up

Target: real local app `http://127.0.0.1:5000`.
Scope: close only previously blocked signed-in/shared-collection states; no guest matrix rerun; no source edits.

## Auth recipe and cleanup

Used the exact `scripts/validation/collections-audit.mjs` UI recipe: create a unique `+clerk_test@example.com` user, navigate to `/sign-in`, fill `input[name="identifier"]`, press Enter, fill `input[name="password"]`, press Enter, and enter OTP `424242` only when `input[aria-label="Enter verification code"]` appeared. No sign-in-token/redirect helper was used.

Each run used a unique prefix and cleanup was limited to that prefix. The existing audit log was independently confirmed: `/tmp/discovery-validation/collections-audit.log`, `TOTAL 12, FAIL 0`, including authenticated Clerk session, guest shared collection, and zero local QA users.

This follow-up's own teardown assertions:
- Journey run: `localBefore: 1`, `localAfter: 0`, `clerkRemaining: 0`.
- Remaining signed/collection run: `localBefore: 1`, `localAfter: 0`, `clerkRemaining: 0`.
- Clean guest-collection capture run: `localBefore: 1`, `localAfter: 0`, `clerkRemaining: 0`.

## Journey completion proof

Signed-in `/journeys` was captured at 375/768/1024/1440. On signed-in `/journey/7`, the UI `button-start-journey` was used, then every grouped UI step button `button-complete-step-1` through `button-complete-step-6` was clicked and observed as its corresponding `button-uncomplete-step-*`.

API assertion from `/api/journeys/7/progress`:
- Grouped step numbers: `[1,2,3,4,5,6]`.
- Every expected row ID was present: `[181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198]`.
- API `completedSteps` contained exactly/all of those row IDs.
- `completedAt`: `2026-09-13T05:24:17.784Z` (present/non-null).

Machine-readable proof: `journey-assertions.json`.

## Signed-in captures

- `journeys-{375,768,1024,1440}.png`
- `journey-7-signed-{375,768,1024,1440}.png`
- `recommendations-signed-{375,768,1024,1440}.png`

Axe at 375/1440:
- Signed `/journeys`: no violations.
- Signed `/journey/7`: no violations.
- Signed `/recommendations`: moderate `heading-order`, 1 node at both widths; no serious/critical findings.

## Guest shared collection

A real collection was created and published by the disposable signed-in owner, then opened in a separate guest context. Latest clean share ID: `X1CIZ-o_lY9WctDQbDRKOl9h`.

Latest clean guest captures:
- `collection-X1CIZ-o_lY9WctDQbDRKOl9h-{375,768,1024,1440}.png`
- The guest context dismissed consent before readiness assertion; each capture waited for `[data-testid="card-resource-185214"]` and `document.fonts.ready`.
- Axe at 375/1440: no violations.
- `collection-clean-assertions.json` records the share ID, all four widths, axe results, and teardown.

The earlier collection capture with share ID `TVaqT56XdxqiETYqUaANRA8g` showed a consent banner and is superseded; its PNGs were removed. Auth and collection cleanup completed for all runs.

No guest matrix was rerun. No auth retry was made after successful exact-recipe sessions; the only intermediate failures were an app restart requirement and selector/assertion harness corrections, not Clerk UI authentication failures.
