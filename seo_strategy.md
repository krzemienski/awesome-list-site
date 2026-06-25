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
- `server/og-middleware.ts` injects route-specific title, description, canonical, Open Graph, and Twitter tags into the HTML shell before it is served.
- Social crawlers can see route-specific head metadata, but AI crawlers and other non-JavaScript bots still receive very little route body content in static HTML.

## Dismissed categories
- (None yet)
