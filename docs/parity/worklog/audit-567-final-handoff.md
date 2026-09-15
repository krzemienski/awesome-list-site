# Audit completion handoff — release acceptance is not green

This is an evidence handoff, not approval to publish. The remaining work
overlaps the existing integration/final-regression tasks; no duplicate
follow-up tasks were created and no acceptance thresholds were waived.

## Supplemental stages 7–8

Command:

```sh
AUDIT_567_INK_OUT=/tmp/audit-567-final-ink node --import dotenv/config scripts/validation/audit-567-ink-accent.mjs
```

Evidence: `../evidence/audit-567-ink-accent/results.json` and `worklog.md`.
All 40 measurements completed: five systems × 375/1440 × Home, category,
resource, and admin overview. The real theme controls were used. The
disposable Nick account was deleted from both local storage and Clerk;
unrelated QA identities were left untouched.

Stage 8: zero visible long-form `p`/`li` elements over 60 characters used
resolved tertiary/quaternary ink in those viewports. Existing per-system
contrast ratios remain in `audit-567-ds-verdicts.md`. This does not claim a
full-document below-the-fold sweep.

Stage 7: the JSON's `status: PASS` means measurement completed, NOT that
accent discipline passed. Its `counts.violations` includes **unclassified
candidates**, not adjudicated defects. The detailed selectors, matched
properties, rectangles and reasons are retained. Review must exclude
nonpainting outline colors and avoid counting inherited SVG children as
separate accent moments. Known distinctions:

- `.header-logo` is branding, not an invented decorative accent; preserve
  official branding.
- `.header-avatar` and its SVG children form one control, not four moments.
- The active accordion indicator is allowed active navigation; category
  bars in the admin overview are chart data, another allowed use.
- `.home-category-icon` and `.admin-canonical-activity-actor` use accent on
  decorative icons and routine activity labels. These conflict with the
  literal written rule but must be reconciled with the frozen page designs
  before changing page-owned CSS.
- The Terminal category view has substantially more matches than other
  systems. Do not suppress the result through a relaxed count threshold.

Stage 6 coordination: `ChipButton` now owns the interactive Home chip hook
without changing its rendered DOM. The shared documentation still names
only `Badge` as hook owner. The integrator should resolve that contract in
`docs/DESIGN-SYSTEM.md` and the verification skill; this leaf has not edited
those shared documents or the frozen source.

## Performance investigation

The retained compiled Lighthouse measurements are real lab measurements,
but the audit-only loopback server is not deployment-topology-equivalent.
Both sides used Lighthouse 12.8.2 mobile. Scores remain 60/57/80 versus
production 91/76/80; required floors remain 88/73/77.

- Home's retained `server-response-time` audit records a 1,240 ms document
  response versus 30 ms in production. Investigate the cold public data
  loading/cache path in `server/home-ssr-data.ts` and `server/ssr.ts`; do not
  remove meaningful SSR to obtain a flattering empty-shell score.
- Category records 891 ms TBT and 5,292 ms LCP. Unlike Home, it is not
  hydrated by the Home-only SSR handler. This establishes a route-boot
  investigation target, **not proof that adding SSR alone will fix it**.
  Attribute the main-thread tasks before selecting a product change.
- Resource meets the requested performance floor.

Reports: `../evidence/audit-567-lighthouse-final/`, with production scores
at `../evidence/multi-system/production-lighthouse.json`.

## Pixel and inventory closure

The all-83-ID parity invocation preserved aggregate-report ownership and
the original threshold 0.1 / maximum 0.5% full-union difference. It was
stopped after 12 conclusive failures on About, approvals and audit
(3.2376%–75.3395%). The remaining 180 pixel rows are incomplete; the report
also records 40 blocked rows. Exit 2 is not a passing final regression.
See `audit-567-status.md` for the exact run/report/log paths.

The 108 routable axe viewport cases remain PASS with zero serious/critical.
Twelve state-only rows remain explicitly SKIPPED, not silently counted as
passed. No error-state injection or production writes were introduced.

The integrator must merge the owned DS verdict fragment into DS-AUDIT.md,
resolve these findings and scope conflicts, then obtain a complete green
final regression before release acceptance can be claimed.

## Completion review

Completion review rejected this partial handoff: task #567 is not complete.
It explicitly requires the aggregate DS verdict, resolved accent/primitive
contract, every-state axe coverage or an explicit scope decision, passing
Lighthouse floors, and a complete final parity run before resubmission.

The accompanying stray-script failure was corrected by exposing real npm
entrypoints `audit:parity-systems` and `audit:parity-ink`; the root-script
gate now passes. The cross-tab product-profile check had timed out during
the completion suite; a focused unchanged-code rerun passed all 18 route
scenarios and cross-tab synchronization. That rerun is not claimed as a
product fix or proof that the timeout cannot recur.