---
name: Server-authoritative JSON-LD
description: Where structured data (schema.org JSON-LD) is emitted and why the client ships none.
---

Route-appropriate JSON-LD is emitted **server-side** by `server/og-middleware.ts`
(via `RouteMeta.structuredData` → `buildMetaTags`). The client
`SEOHead` component deliberately emits **no** JSON-LD.

**Why:** Non-rendering crawlers only see the server HTML; a rendering crawler
hydrates the same HTML. Emitting JSON-LD from both the server and the client
risks two different/conflicting schema graphs for one page. One authority avoids
that entirely.

**How to apply:** Add or change structured data in og-middleware's per-route
resolution, not in SEOHead. Soft-404 (noindex) pages must NOT emit JSON-LD,
canonical, or og:url (handled by the `m.noindex` guards). When emitting JSON-LD
into a `<script>`, escape `<` → `\u003c` to prevent `</script>` breakout.
