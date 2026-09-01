---
name: Accessible names belong to the component that renders the control
description: Why a parent must never patch a child's aria-label via MutationObserver — the name goes stale when state changes.
---

# Own accessible names in the component that renders the control

A parent must not reach into a child's DOM to set `aria-label` / `title`, even
via a `MutationObserver` that keeps re-applying them.

**Why:** A card-level observer was used to give two visually-identical action
buttons distinct, context-aware accessible names. It worked on first render and
looked correct in a DOM readback. But the child buttons are `memo`-ised, so
after an in-place SPA state change (signing in without a page load) their props
never changed, no mutation fired, and the observer's cleanup never restored the
originals — leaving users with names that actively contradicted reality
("sign in required" while signed in). A DOM readback at one moment in time
cannot catch this; only exercising the state transition can.

**How to apply:** When two similar controls need to be told apart, compute the
name inside the component that renders the control, from the same state it
already subscribes to. If a parent has context the child lacks, pass it as a
prop — never as a post-render DOM patch. Treat any parent-side
`setAttribute("aria-label", ...)` or `MutationObserver` over a child's ARIA as
a defect, and verify accessible-name fixes across the state change that makes
them wrong, not just on first paint.
