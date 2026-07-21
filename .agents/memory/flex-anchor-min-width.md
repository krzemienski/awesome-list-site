---
name: Flex-anchor min-width:auto defeats overflow-wrap
description: Why unbroken long text inside a flex container refuses to wrap even when the dialog/container has overflow-wrap and min-w-0
---

**Rule:** Text placed directly inside a flex container (e.g. `<a className="flex items-center gap-1">{url}<Icon/></a>`) becomes an anonymous flex item with `min-width:auto`. It will NOT wrap, no matter what `overflow-wrap`/`min-w-0` the ancestors carry — the anonymous item can't be targeted by CSS. An unbroken ~2,000-char URL then blows the whole dialog to its intrinsic width.

**Why:** Two remediation cycles clamped the dialog shell (dialog/alert-dialog primitives got `min-w-0` + `overflow-wrap:anywhere`) and the blowout persisted; the real anchor was the flex-item text node.

**How to apply:** Wrap the raw text in its own element: `<span className="min-w-0 [overflow-wrap:anywhere]">{url}</span>`, add `min-w-0` on the flex anchor and `shrink-0` on the icon. When hunting horizontal blowouts, inspect every flex container whose direct child is raw user-supplied text. Permanent guard: the responsive-audit harness self-seeds a pending resource with a ~1,950-char URL via the real API, asserts `scrollWidth <= clientWidth` in all admin approval dialogs at 3 viewports, then deletes the seed — prefer this seed→assert→delete pattern over hoping a pathological row exists.
