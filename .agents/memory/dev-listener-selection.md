---
name: Dev listener selection for captures and API checks
description: The default proxied dev hostname can route to the design-system artifact instead of the main app; address listeners explicitly.
---

**Rule:** for API checks and browser captures in development, address the
listener explicitly — main app `http://127.0.0.1:5000`, registered design-system
artifact on its managed workflow port (20928 at the time of writing). Never use
the default proxied dev hostname as proof of what the *app* serves.

**Why:** with the artifact workflow running, the default proxied hostname
returned the artifact's HTML even for `/api/awesome-list`, which looks exactly
like "the catalog is empty / the API is broken" when it is neither.

**Also:** `eslint .` is red at HEAD for every `.mjs` in the repo (typescript-eslint
project-service "not found by the project service" parsing errors, including
`scripts/validation/*.mjs`). A new `.mjs` failing lint that way is not a
regression introduced by the change; do not chase it as one.

**How to apply:** parity/audit harnesses should take explicit origins
(`PARITY_APP_ORIGIN`, `PARITY_ARTIFACT_ORIGIN`) and verify a route marker from
the intended listener before capturing.
