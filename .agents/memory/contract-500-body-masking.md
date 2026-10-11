---
name: Contract layer masks 500 bodies
description: Every /api 500 body is rewritten to "Internal Server Error"; admin write errors use the shared write-error helper, whose outcome copy must stay uncertain unless write+audit are one transaction.
---
The response observer on every `/api` route rewrites any status-500 JSON body to `{"message":"Internal Server Error"}`. A handler's own 500 message never reaches the client.

**Why:** the boundary stops DB/exception details leaking. Route-written "nothing was changed" 500 messages silently became generic text in the admin UI.

**How to apply:**
- For an actionable server-failure message, use a fitting non-500 status (409 conflict such as a raced unique violation, 503 transient) or map 5xx on the client via the shared `describeWriteError` helper.
- A 5xx does NOT prove nothing changed: most admin routes commit the write, then await a separate audit-log insert (and timed-out statements can still commit later). Default/outcome copy must be uncertain ("may not have been saved — refresh to check before trying again"). Claim "nothing changed" only where the write and its audit share one transaction (journey step routes do; taxonomy, backups, resources do not). False certainty makes admins retry into duplicates.
- A forced-500 interception only proves rendering; post-commit failure is reproduced for real by holding an ACCESS EXCLUSIVE lock on the audit table during the write (surfaces as 503).
- Forced-response harnesses must abort every other non-GET /api request, or a method mismatch lets real writes through.
