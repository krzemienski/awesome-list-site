---
name: Dev listener selection for captures and API checks
description: The default proxied dev hostname can route to the design-system artifact instead of the main app; address listeners explicitly.
---

**Rule:** for API checks and browser captures in development, address the
listener explicitly — the main app on its configured workflow port, the
registered design-system artifact on its own managed workflow port. Never use
the default proxied dev hostname as proof of what the *app* serves.

**Why:** with the artifact workflow running, the default proxied hostname
returned the artifact's HTML even for `/api/awesome-list`, which looks exactly
like "the catalog is empty / the API is broken" when it is neither.

**How to apply:** parity/audit harnesses should take explicit origins
(`PARITY_APP_ORIGIN`, `PARITY_ARTIFACT_ORIGIN`) and verify a route marker from
the intended listener before capturing.
