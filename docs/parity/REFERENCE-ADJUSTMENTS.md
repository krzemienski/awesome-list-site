# Approved comparison-reference adjustments

## Authority

On 2026-09-17 the user selected **“Approve separately reviewed,
contract-compliant references”** in response to the documented conflicts in
[COMPLETION-REVIEW.md](COMPLETION-REVIEW.md).

This is an additive approval, not permission to regenerate expected images
from the actual application. The frozen `awesome-list-site-ds/` directory and
original archive remain immutable. Existing approved content/branding
reconciliations remain in force.

## Permitted scope and independent acceptance criteria

| ID | Expected-side adjustment | Independent acceptance |
|---|---|---|
| tablet-sidebar | Mobile drawer behavior begins strictly below 768px; the normal tablet sidebar remains visible at exactly 768px and is 240px wide. | Original contract lines 199–200 and frozen spacing documentation lines 139–145. Inspect boundary rules and visible sidebar geometry; do not copy the application's complete shell styles. |
| mobile-wrap | Let mobile docs/showcase content wrap and shrink naturally within the viewport. | Preserve content and normal flow. No page-level sideways overflow, global clipping, hiding, forced ellipsis, screenshot crops, or fixed-height compensation. |
| accessible-controls | Apply the required 44px minimum to interactive controls, including compact prototype controls. | Original contract lines 420–421 and frozen accessibility documentation line 173. Preserve labels and actions; measure control targets, not just their visual icons. |
| canonical-fonts | Request the canonical nine-family Google Fonts sheet on reference documents, including IBM Plex Sans. | Original font requirement lines 179–183. Use the frozen shell's exact canonical URL, not a narrower subset or a URL inferred from current runtime CSS. Keep declared-face and file parity strict. |

The independent source reviewer confirmed these four boundaries before
implementation. An initial suggestion to suppress taxonomy kind badges was
explicitly rejected and retracted: **kind information and visible badges are
not included in this approval.**

## Non-negotiable comparison rules

- Apply adjustments separately and in memory, before rendering the reference.
- Record rule IDs, source anchors, substitutions, and raw/served hashes.
- Fail explicitly if a required source anchor changes or disappears.
- Use identical adjustments in normal and determinism captures.
- Do not import actual application styles into the expected renderer.
- Preserve pixelmatch threshold **0.1** and differing-pixel ceiling **0.5%**.
- Compare the complete union canvas without masking, cropping or resizing.
- Keep previous results and full-inventory reports historical and unchanged.
- Selected visitor app captures remain diagnostic evidence, not authenticated
  acceptance or additions to the compared-pixel denominator.

## Implementation and evidence

Implemented in `tests/parity/comparison-reference-adjustments.json` and
`comparison-reference-adjustments.mjs`, integrated before reference serving in
`runner.mjs`. The final manifest applies 17 operations/assertions and pins nine
raw source files. Normal and determinism paths share the adjusted snapshot.
Both retain adjustment provenance; ordinary comparison rows also record
read-only viewport, sidebar and control geometry. Geometry never overrides a
pixel verdict.

An independent reviewer examined the initial implementation and each refinement.
The final source verdict is PASS, **not full runtime acceptance**. Review
corrections removed a broad grid override and unsupported padding changes,
added exact markers to generated documentation content, and expanded 44px
coverage to genuine navigation and sidebar controls. No kind badges were hidden.

### Retained real runs

| Run | Scope | Result |
|---|---|---|
| [Initial](../../tests/parity/baseline/2026-09-17T22-35-11-799Z-14539/REPORT.md) | Category, Forms, Typography, Showcase at 375/768 | 6 artifact FAIL, 2 visitor EVIDENCE, no incomplete captures. Font parity matched all eight. Mobile reference overflow and incomplete control coverage led to scoped corrections. |
| [Refined](../../tests/parity/baseline/2026-09-17T22-47-20-156Z-16033/REPORT.md) | Category, Forms, Showcase at 375/768 | 4 artifact FAIL, 2 visitor EVIDENCE, no incomplete captures. All six reference pages fit their viewport and font parity matched. |
| [Sidebar follow-through](../../tests/parity/baseline/2026-09-17T22-54-02-690Z-16616/REPORT.md) | Category at 375/768 | 2 visitor EVIDENCE rows. No page overflow; at 768 the sidebar is visibly 240px wide. Mobile has no undersized measured controls. Tablet still had 27 classless controls with an inline 32px minimum. |

The last run's exit code 0 means visitor evidence was captured successfully,
**not that visual acceptance passed**. Shared full-inventory reports and
historical baselines were not replaced. All runs recorded unchanged workspace
inputs during capture and no capture infrastructure failures.

Latest applicable artifact measurements:

| Surface | Width | Pixel difference | Font parity | Reference page overflow | Undersized measured controls |
|---|---:|---:|---|---|---:|
| Forms | 375 | 2.5280% — FAIL | Match | None | 0 / 30 |
| Forms | 768 | 2.5107% — FAIL | Match | None | 0 / 30 |
| Showcase | 375 | 20.7156% — FAIL | Match | None | 0 / 35 |
| Showcase | 768 | 1.5077% — FAIL | Match | None | 0 / 35 |

Subsequent sidebar-only selectors do not match these artifact surfaces; the
independent reviewer confirmed their evidence remains applicable. Category
diagnostic differences remain 5.8761% at 375 and 6.9834% at 768. Visitor identity
differs from the frozen signed-in demonstrator and is not a pixel acceptance
denominator.

### Final correction and verification boundary

The 27 remaining tablet controls share the single inline
`minHeight: 32` declaration in frozen `sidebar-variants.jsx`. The final manifest
changes that exact source anchor to 44 **in memory only**, with a pinned hash
and one-occurrence assertion. Independent source review passed. Direct
application confirmed the served 44px declaration and rejection of corrupted
source, and both JavaScript modules passed syntax checks.

**That last inline-minimum correction has not been browser-remeasured.**
Do not report zero undersized tablet sidebar controls until the next focused
category measurement proves it. No standalone determinism run, new authenticated
run, complete-width/50-theme matrix, or full visual acceptance is claimed.

Main inspected category and Forms comparison captures and a current 1280px
artifact Forms preview. The preview rendered normally with no browser errors.
Inspection crops were temporary viewing aids only; every measured comparison
used the original full-page captures without cropping or masking.

Full lint, authenticated/member/contact coverage, isolated-database testing,
local production-mode checks and the observed published SSR issue remain open
in the completion review. No publishing or production changes are authorized.