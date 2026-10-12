---
name: SEO and routing lessons
description: Topic index for metadata identity, crawler rendering, route state, and deployment-edge behavior.
---

Read the relevant linked lesson before changing metadata or navigation.

**Why:** separate build/render passes and routing layers have repeatedly hidden
failures that passing HTTP or path-only checks did not detect.

**How to apply:** select the narrow topic below; these links preserve the detailed
lessons without filling the always-loaded memory index.

## Metadata and crawler rendering
- [Canonical origin parity](canonical-base-env-divergence.md) — compare full canonical and social URLs, including origins.
- [Server-authoritative JSON-LD](jsonld-server-authority.md) — avoid competing structured-data owners.
- [Resource browsing parity](resource-browsing-parity.md) — crawler listings and browser listings must describe the same resources.
- [Crawler prerender versus SSR](spa-crawler-prerender.md) — crawler markup is not hydrateable React.
- [SEO soft-404 and sitemap](seo-soft-404-architecture.md) — statuses, indexable routes, and sitemap must agree.
- [SEO title parity](seo-title-two-pass-parity.md) — crawl and hydrated titles must match.
- [Noindex lockstep](seo-client-server-noindex-lockstep.md) — hydration must not restore indexing to protected/error pages.
- [Outage HTML shell](og-middleware-outage-shell.md) — HTML and API outage responses have different contracts.

## Routes and browser history
- [wouter query omission](wouter-location-no-query.md) — path-only location hooks miss query changes.
- [Parameter scrubber honesty](scrubbed-params-honesty.md) — pre-boot query cleanup needs a visible explanation.
- [Reserved route characters](reserved-character-spa-routes.md) — encode once and preserve escape case.
- [New SPA route registration](spa-new-route-registration.md) — client route registration alone is insufficient.
- [History navigation](url-sync-effect-popstate.md) — mirroring effects must not overwrite routes after leaving the page.
- [Skip-link preservation](skip-link-route-preservation.md) — focus movement must preserve the current route and chapter.
- [SPA curl checks](vite-spa-curl-smoke-checks.md) — shell responses cannot prove client-rendered copy.

## Deployment edge
- [www/apex DNS split](www-domain-split-brain.md) — certificates and edge redirects are not application fixes.
- [Edge percent decoding](edge-percent-decoding.md) — normalization probes can be changed before reaching the app.
