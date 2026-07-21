---
name: Short-circuit masks which row throws
description: Why a missing/undefined reference can crash only the "active"/matching item and look route-dependent, plus how to capture React's hidden render error.
---

# Short-circuit hides which row throws

When a value is only evaluated on the right-hand side of `a && expr` (or `a ? expr : ...`),
a `ReferenceError`/throw inside `expr` fires ONLY for the row where `a` is true. In a
list/`.map()` this looks route- or item-dependent: the page with no matching/active row
renders fine, the page with one crashes. It is NOT a stale-HMR or CSS-open-state issue.

**Concrete instance:** a component prop declared in the TypeScript props *type* but omitted
from the destructured parameter list is an undefined free variable at runtime. If it is only
referenced behind `activePath === catPath && new URLSearchParams(activeSearch)...`, every
non-active row short-circuits before touching it, so only the active row throws. A `try/catch`
placed around that exact expression may still appear to "catch nothing" if a stale module is
running — trust a fresh full restart, not HMR, when diagnosing.

**Why:** the same code path exists on every row; only the guard's truthiness differs, so the
bug presents as "crashes on the category page but not home."

**How to apply:** when a render crash is route/item-dependent, first suspect a value that is
only reached on the matching branch (missing prop, undefined var, null field). Grep the props
*type* vs the destructure — TS won't flag a type-only prop that's never destructured.

# Capturing React's hidden render error
React 18 dev sometimes logs only "The above error occurred in <X>" + component stack, NOT the
actual `Error.message`. To get the real message + stack, temporarily add in the entry file
(`main.tsx`): `window.addEventListener("error", e => console.error("WINDOW_ERROR>>", e.error?.message, e.error?.stack))`
then reload and read the console. Remove after diagnosing.
