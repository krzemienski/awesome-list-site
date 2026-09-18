---
name: Validation gates vs deliberately folded UI
description: Native <details> / React "More" disclosures hide the selectors that DOM sweeps assert on; reveal disclosures (never popups) before asserting, and retarget stale selectors instead of loosening the pass rule.
---
When canonical panels fold secondary tools behind disclosures (`<details>`,
React-state "More"/"Tools"/"Filters & view" toggles), DOM-sweep gates that
wait for a selector inside the fold time out and read as "the app broke".
It is gate drift, not an app regression: the controls are in the DOM but not
visible.

**Why:** a family of sweep failures across admin tabs and listing routes traced
to folds added after the last green sweep; forcing `details.open` alone does not
help because some `<summary>` elements preventDefault and drive React state,
and keyboard-first toggles (opacity 0 until focus-visible) time out on click.

**How to apply:** reveal on EVERY swept surface, not just routes that declare
tools: open every collapsed `aria-expanded="false"` button/summary inside the
scope except popup/combobox/tab triggers, all visible ones per round, looping
until none remain, click then keyboard fallback, and FAIL if collapsed controls
remain after the bound (a partial reveal is a partial sweep). This only adds
elements to the surface. Retarget copy-based selectors to testids. Expect the
reveal to surface new app-side strays — fix those with the shared primitive,
never with a filter exclusion; and make any exclusion narrow + positive (match
the exact location AND assert the contract it claims) so it cannot be borrowed.
