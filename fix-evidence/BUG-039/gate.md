# VG-039 — Toast displays raw JSON → PASS

## Root cause
`ApiError.message` was the legacy `"<status>: <raw body>"` string
(e.g. `401: {"message":"Invalid email or password"}`), and ~25 toast sites
render `error.message` directly, so raw JSON reached users anywhere a site
didn't route through `humanizeApiError()`.

## Fix (choke point, all toast sites at once)
- `client/src/lib/apiError.ts`: extracted `humanizeStatusBody(status, body)`
  (JSON body → its human `message`/`error` string, else plain readable text,
  else per-status friendly fallback).
- `client/src/lib/queryClient.ts`: `ApiError` now sets its `message` to the
  humanized copy at construction and preserves the raw server body on `.body`.
- Structured consumers updated to prefer `.status`/`.body` props:
  `humanizeApiError()` and `extractFieldErrors()` (per-field form errors keep
  working); legacy "STATUS: body" string parsing retained for non-ApiError
  errors. The only message-content parser (`isUnauthorizedError`) checks
  `.status === 401` first, unaffected.

## Live evidence (Playwright, real UI, real API error)
Login attempt with wrong password at /login:
- Real API response captured: `401` body `{"message":"Invalid email or password"}`
- Toast rendered: **"Login failed — Invalid email or password"**
- Raw JSON braces in toast: false; "NNN:" status prefix in toast: false.
- The failed state is not hidden: user stays on /login with the error toast
  and can retry (actionable).
Screenshot: vg039-toast.png. Verdict: **PASS**
