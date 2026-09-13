---
name: Admin kind resolution boundary
description: Why browser-side kind inference must remain guarded against custom server mappings.
---

Client inference with the shared resolver is permitted only while custom kind
mapping arrays are empty. Treat a nonempty server mapping as a contract change:
admin list and mutation responses must expose server-authoritative resolution
before the client-only assumption can be removed.

**Why:** public serialized resources and raw admin rows do not necessarily carry
the same derived fields. A shared algorithm alone is insufficient if its server
configuration is not available to the browser. Per-row detail fetches would add
N+1 requests to a paginated administrative table.

**How to apply:** keep the mapping-invariant gate required until the admin wire
contract includes authoritative resolution; then retire the guarded client
assumption deliberately rather than allowing silent mapping drift.