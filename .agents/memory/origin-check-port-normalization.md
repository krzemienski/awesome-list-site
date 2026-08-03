---
name: Full-origin CSRF comparison
description: Origin checks must compare normalized scheme, host, and effective port while tolerating explicit default ports at the edge.
---

**Rule:** Any Origin-header CSRF gate must compare the complete normalized origin: scheme + host + effective port. Build the request origin from forwarded protocol plus Host, normalize both sides with `URL.origin` (which removes only the correct default port for that scheme), and use `PUBLIC_SITE_URL` as the exact fallback origin — NOT `SITE_URL`.

**Why:** Host-only comparison accepts a scheme downgrade (`http://host` against an HTTPS request), while raw string comparison rejects equivalent edge variants such as explicit `:443`. A dead fallback env var can also make every production mutation fail.

**How to apply:** Whenever touching Origin/Referer middleware, verify same-origin, wrong scheme, wrong port, explicit correct default port, nondefault port, canonical fallback, no-Origin, cross-site Fetch Metadata, and `Origin: null`. A 403 versus route-level 200/400/401 distinguishes gate rejection.
