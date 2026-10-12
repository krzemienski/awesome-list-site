---
name: Canonical origin parity
description: Why metadata parity must compare full origins, not just matching canonical paths.
---

# Canonical origin parity

Compare full canonical and social URLs between the crawler response and the
hydrated browser. Matching paths and query strings do not prove matching site
identity.

**Why:** a retired GitHub Pages client origin escaped the SEO parity gate because
that gate discarded origins before comparing URLs. Separate build-time and
server settings made the conflict possible even with matching titles and robots.

**How to apply:** use the server's canonical-origin configuration for client
builds, deliberately check that a legacy client override cannot win, and inspect
metadata after SPA navigation as well as a document load. Rebuild and republish
when canonical-origin configuration changes; a server restart alone cannot
update metadata embedded in an already-built client.
