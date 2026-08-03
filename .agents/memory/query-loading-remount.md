---
name: Query-loading remount trap
description: Top-level isLoading skeleton + raw keystroke state in a queryKey unmounts inputs mid-typing; fix = debounced key + keepPreviousData + first-load-only skeleton.
---

# Top-level `isLoading` skeleton + keystroke-driven queryKey = input unmount

**The rule:** never put raw per-keystroke state into a TanStack Query key when the
component has a top-level `if (isLoading) return <Skeleton/>` branch. Each keystroke
creates a brand-new key with no cached data → `isLoading` flips true → the whole
component (including the input being typed into) unmounts. Symptoms: input value
truncates to the first character, focus lost, one network request per remount,
rapid typing can hang the page.

**Fix pattern (all three parts):**
1. Debounce the text into a separate `debouncedSearch` state (~300 ms) and key the
   query on that; flush the debounce on explicit form submit.
2. `placeholderData: keepPreviousData` (TanStack v5) so key changes keep `data`
   populated and `isLoading` stays false after first load.
3. Gate the skeleton with `isLoading && !data` — only the true first load may
   replace the form.

**Why:** Audit-2 BUG-003 — the admin resource search truncated "webrtc" to "w"
(verified: one request `search=w`, input remounted). After the pattern above:
full text retained, focus kept, exactly one request for the complete string.

**How to apply:** any searchable/filterable table where the filter inputs live in
the same component as the query-driven content. Check for this trap whenever a
"search only searches the first letter" or "input loses focus while typing" report
comes in.
