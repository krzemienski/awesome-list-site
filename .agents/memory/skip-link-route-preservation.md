---
name: Skip-link verification in fragment-routed interfaces
description: Focus landing is insufficient proof when the URL fragment also selects the rendered page.
---

Verify a skip link preserves the current page/chapter as well as moving focus.

**Why:** an initial browser check accepted focus reaching main, but native
fragment navigation also selected a different page. The defect appeared only
from a non-default chapter or secondary surface.

**How to apply:** activate with the keyboard from a non-default page, then
assert the route, rendered heading and active chapter remain unchanged after
navigation settles. Checking only the focused element can produce a false pass.