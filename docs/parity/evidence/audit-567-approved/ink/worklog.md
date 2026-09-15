# Task 567 Stage 7/8 ink and accent evidence

Captured: 2026-09-15T02:58:37.772Z
Base: `http://127.0.0.1:5000`
Browser: pinned Playwright Chromium via the required browser lease

## Scope

- This owned evidence measures only Stage 7 accent discipline and Stage 8 text ink tiers.
- Existing Task 567 smoke, theme-combination, and axe evidence was not rerun, changed, or deleted.
- The five systems use their actual shipped default accents and are measured at 375×812 and 1440×900.
- Public surfaces are Home, category/encoding-codecs, and resource/185020. Admin overview uses one real disposable Nick admin.
- Visibility means a non-hidden element whose bounding rectangle intersects the current viewport; off-screen page content is not counted.

## Measurement totals

- Rows: 40/40
- Visible computed accent users recorded: 442
- Accent users classified as violations: 1
- Long visible p/li ink offenders (resolved text-3/text-4): 0
- Rows with route/runtime errors: 0

Each row in `results.json` retains the exact selector, normalized text, computed properties, classification, grouping, viewport geometry, and resolved CSS colors. Stage 8 compares computed element color against resolved probe colors, not raw custom-property strings, so alpha serialization is retained.

## Identity safety

- The Nick helper created one disposable admin in its original authenticated browser context.
- Only that helper-owned identity teardown was called; no global QA identity sweep was run.
- Teardown completed: yes.

## Findings

- Accent discipline: 1 classified violation(s); review exact entries.
- Ink tiers: no long visible p/li matched resolved text-3/text-4.
- No semantic rule was waived: uses outside the explicit allowed-use classifier remain violations, and multiple primary buttons are not silently treated as one accent moment.
