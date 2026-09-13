---
name: Folded Radix tab activation
description: Selecting a highlighted parent does not change controlled Radix value when a nested subsection is open.
---

When several underlying views map to one selected Radix tab, handle activation
of the already-selected parent explicitly for pointer and keyboard input.

**Why:** Radix suppresses same-value `onValueChange`; a subsection can remain
open even though the user activates the canonical parent. Testing only entry
deep links and arrow navigation does not catch the return-path failure.

**How to apply:** Verify subsection → parent via click, Enter, and Space,
including content and URL state, not just the already-true `aria-selected`.