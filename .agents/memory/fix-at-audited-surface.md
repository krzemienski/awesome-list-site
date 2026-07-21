---
name: Fix at the audited surface
description: An endpoint-level fix can verify green while the UI never reads that endpoint — always reproduce at the user-visible surface first.
---

**Rule:** When remediating a black-box/UI audit finding, prove the fix at the surface the auditor actually saw (the rendered UI), not just at an API endpoint that plausibly backs it.

**Why:** A tag-duplication finding was "fixed" by canonicalizing `/api/tags` SQL and proven with curl — but the filter panels build their tag chips client-side from raw resource data and never call `/api/tags`. The audit's repro surface was untouched; architect review caught it. The real fix needed a shared client-side `normalizeTag()` applied to both chip aggregation and filter predicates.

**How to apply:**
- Before claiming FIXED, trace which data path the visible UI actually consumes (grep for the endpoint in client code — no consumer means the fix is cosmetic).
- If normalization/business rules end up duplicated (SQL + client), note explicitly in code comments and docs that the two must stay in lockstep.
- Verify with a browser-level probe (Playwright) of the exact UI element the audit flagged, not just curl.
