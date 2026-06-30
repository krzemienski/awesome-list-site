# SEO Strategy

## In scope
- Public marketing pages
- Public resource discovery pages
- Public category, subcategory, resource, and journey pages
- Social sharing previews and AI crawler visibility for public pages

## Out of scope
- Authenticated dashboard and profile pages (`/profile`, `/bookmarks`)
- Admin pages (`/admin/**`)
- Authenticated settings and internal tooling
- API endpoints except where they directly power crawl files such as `sitemap.xml`

## Target audience
- Developers, engineers, and technical learners looking for video development resources

## Primary keywords
- awesome video resources
- video development resources
- video streaming tools
- video codecs
- video players
- FFmpeg resources

## Technical SEO notes
- Public routes are SPA-rendered in production; `server/ssr.ts` is currently disabled.
- `server/og-middleware.ts` injects route-specific title, description, canonical, Open Graph, Twitter, and JSON-LD tags into the HTML shell before it is served.
- Core discovery routes (`/`, taxonomy pages, resource pages, `/journeys`, and `/journey/:id`) plus `/about`, `/advanced`, and `/submit` receive server-injected semantic body HTML (headings, descriptions, and internal links) for non-JavaScript and AI crawlers.
- Utility/auth routes `/login` and `/register` return HTTP 200 but are marked `noindex` (robots `noindex,nofollow`, no canonical/og:url) so they do not compete in search.
- Client hydration preserves the server head: loading branches on the home, taxonomy, and resource pages no longer emit placeholder `Loading…`/`Error` titles, and the missing-resource branch re-asserts the server's `noindex` soft-404 contract instead of a default indexable head.
- The "Explore Categories" CTA on `/advanced` and other cross-page links are generated from the live taxonomy, so internal links cannot drift to non-existent category slugs.

## Dismissed categories
- (None yet)
