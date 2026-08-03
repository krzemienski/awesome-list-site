---
name: Global ApiError handler coverage
description: Central react-query 401 handling only sees ApiError instances; hand-rolled queryFns throwing plain Error bypass it silently.
---

# Global ApiError handler coverage

Rule: a global QueryCache/MutationCache handler keyed on `error instanceof ApiError` covers only fetches that throw `ApiError`. Any hand-rolled `queryFn`/mutation with `if (!res.ok) throw new Error(...)` bypasses it — no status ever reaches the handler, and with `placeholderData: keepPreviousData` the surface can render stale or empty data with no visible error at all.

**Why:** verifying session-expiry UX showed an admin tab quietly rendering an empty list after cookie loss instead of the sign-in prompt — its custom queryFn threw a plain Error.

**How to apply:** when relying on centralized `error.status` handling, grep components for `throw new Error` adjacent to `.ok)` and convert to `new ApiError(res.status, msg)`; check mutation error paths that parse the body before throwing, not just queries. When scripting the conversion, substring checks like `'ApiError' in src` false-positive on names such as `humanizeApiError`.
