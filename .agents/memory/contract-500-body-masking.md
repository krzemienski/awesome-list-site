---
name: Contract layer masks 500 bodies
description: Every /api 500 response body is rewritten to "Internal Server Error"; route-level actionable 500 messages never reach the client.
---
The response observer mounted on every `/api` route rewrites any status-500 JSON body to `{"message":"Internal Server Error"}`, keeping only `success`. A handler's carefully worded 500 message is dropped on the wire.

**Why:** this boundary stops DB and exception details from leaking. A "nothing was changed, reload" message written in the route silently became generic in the admin step editor, and a browser run showed the bare text.

**How to apply:** for an actionable message on a server failure, either use a non-500 status that fits (409 conflict, 503 transient), or have the client map `ApiError.status >= 500` to its own text. Never verify a 500 message with a unit test alone; check the real wire body.
