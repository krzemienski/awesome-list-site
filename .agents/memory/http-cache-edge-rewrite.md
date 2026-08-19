---
name: HTTP cache edge rewrite
description: Platform Google-Frontend may downgrade an origin public asset cache header on the first cookie-less response.
---

The application must emit the explicit cache policy appropriate to the resource, but a cookie-less first request through the platform edge can receive a `GAESA` affinity `Set-Cookie`. Google Frontend then applies the normal shared-cache safety rule and reports the response as `private`; a subsequent request carrying the affinity cookie preserves the origin `public` policy.

**Why:** Treating the first response's `private` header as app configuration leads to futile changes to the static server while overlooking the platform-owned rewrite.

**How to apply:** Verify asset-cache changes at the origin/local production server and compare edge responses with and without the affinity cookie. Keep content-addressed assets explicitly `public, max-age=31536000, immutable`; do not attempt to compensate by caching nonce-bearing HTML.