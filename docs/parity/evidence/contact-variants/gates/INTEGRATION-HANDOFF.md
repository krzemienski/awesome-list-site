# Contact variant integration handoff

Updated 2026-09-15 UTC (2026-09-14 America/New_York).

## Implemented and verified

The earlier import-edge handoff is resolved. Direct compile-time
`import.meta.env.VITE_CONTACT_VARIANT` guards now surround the lazy imports in
MainLayout, AppFooter, search-dialog, and ResourceDetail. The existing Suggest
Edit button is preserved both when contact is disabled and while the optional
resource wrapper loads. Contact component contracts, styles, API behaviour,
authentication, consent, and global defaults were not changed.

`continuation/build-matrix.json` records eight successful real Vite builds:

| Configuration | Optional component modules emitted |
| --- | --- |
| unset / empty / `z` | None; no contact stylesheet either |
| `a` | footer |
| `b` | dialog, footer, palette item |
| `c` | footer |
| `d` | resource action |
| `e` | dialog, palette item |

Every enabled optional component and its stylesheet remains outside the static
entry closure. The existing public-config client and admin inbox are legitimate
default-build modules, not optional surfaces. The default bundle budget passes:
627.2 KiB raw, 194.4 KiB gzip, 163.5 KiB Brotli.

The follow-up real-browser smoke on isolated unset/e/d servers verifies the
default footer and palette have no contact surfaces, the core Suggest Edit
fallback remains, E's lazy palette item is arrow-key selectable and opens a
focused dialog, and D's lazy action opens the unchanged signed-out edit gate.
No database or Clerk writes were needed for this follow-up.

## Harness repair

The exact-file ESLint override uses the official `disableTypeChecked` preset for
the standalone ESM validator while retaining JavaScript checks. The harness
passes lint. Its off-state path now requires the rendered footer and an opened
search palette; it no longer swallows a document-ready timeout. The unchanged
typed integration files have the same focused lint findings as HEAD.

## Remaining integration acceptance

The user approved the archive's contact-prototype scope for task #566, retaining
behaviour, accessibility, tokens, screenshots, and bundle verification here.
The following repository-wide requirements belong to task #570 under that
approved boundary; they are still required, not waived or reported green.

Full repository lint is not green. Historical integration results are not a
current green integration run, and no current full `test:e2e` pass is claimed.
The archive supplies no independent pixel references for the new contact
prototypes, so their eligibility is functional/token/screenshot evidence.
For existing-page comparisons preserve 0.1 pixelmatch threshold, ≤0.5% differing pixels,
full union canvas, and no masking/cropping in downstream regression work.

See `RESULTS-SUMMARY.md` and its retained `continuation/` evidence. No publishing,
frozen-source edits, aggregate-report edits, or global configuration changes
were performed.