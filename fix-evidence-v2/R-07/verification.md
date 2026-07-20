# R-07 — Logged-out /submit inputs semantically disabled (LOW, relates BUG-019)

**Date:** July 20, 2026 · **Status:** FIXED-PRIOR in code (Run22 fieldset), pending republish · **Verified live against dev**

## Finding vs reality

The audit read the per-element `disabled` IDL property (`input.disabled === false`) and
concluded typing was "JS-suppressed". The actual mechanism is a native
`<fieldset disabled={!isAuthenticated}>` wrapping all fields (SubmitResource.tsx, landed
with the Run22 BUG-019 fix, commit 17efc7ab). Per the HTML spec, form controls inside a
disabled fieldset ARE disabled — the per-element attribute stays absent, but `:disabled`
matches and the accessibility tree reports disabled. Prod predates the republish.

## Evidence (probe.mjs, probe-a11y.mjs — logged-out /submit, dev)

1. **DOM dump** (`probe.mjs`): `fieldset { hasDisabledAttr: true, matchesDisabled: true }`;
   every control (input-title, input-url, input-description, select-category, …) has
   `matchesDisabled: true`, `inDisabledFieldset: true`. Real typing attempt into the title
   field produced `""` — natively blocked, not JS-suppressed.
2. **Accessibility tree** (CDP `Accessibility.getFullAXTree`): all form controls expose
   `disabled: true, focusable: false` to AT —
   Title/URL/Description textboxes, Category combobox, Tags textbox, Submit button.
3. **Keyboard reachability**: 25 sequential Tab presses walk consent → skip-link → header →
   sidebar nav; **no form field ever receives focus** (`formFieldEverFocused: false`).

Screenshot: `r07-submit-loggedout.png` (login gate + visibly dimmed form).

## Action

No code change needed. Satisfied by the pending Run23 republish.
