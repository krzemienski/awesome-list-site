# R5-060 — Auth guard before method dispatch

**Claim: fixed (code).** (HIGH)

isAuthenticated runs BEFORE method dispatch on /api/admin/* + authed-only routes, so anon requests
of ANY method get a uniform 401 (no 405 method-enumeration). Authed wrong-method still gets 405+Allow.
Repro (http1.out): anon PUT/DELETE/PATCH/POST /api/admin/resources/1 -> 401 (all four).
