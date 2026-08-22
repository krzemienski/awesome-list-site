---
name: New SPA route registration
description: Client routes fail closed in several layers beyond the router — verify in a browser
---

In this app, adding a route to the client router is not enough: several layers
intentionally fail closed for unregistered paths (a known-route allowlist that
hard-404s ahead of the router, a breadcrumb map that refuses to label unknown
slugs, and the server-side crawler metadata that must stay in noindex/title
lockstep with the client — see seo-title-two-pass-parity.md and
seo-client-server-noindex-lockstep.md).

**Why:** the fail-closed layers exist so bogus URLs never masquerade as real
pages; a new route that compiles and matches the router can still render the
404 surface.

**How to apply:** after adding any route, load it in a real browser before
trusting it — a "dead link" telemetry log on a route you just added means one
of the fail-closed layers hasn't been told about it yet; grep for where NotFound
is rendered outside the router to find them.
