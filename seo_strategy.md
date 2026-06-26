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
- Core discovery routes (`/`, taxonomy pages, resource pages, `/journeys`, and `/journey/:id`) also receive server-injected semantic body HTML for non-JavaScript crawlers.
- Remaining utility/support routes such as `/submit`, `/login`, and `/register` still rely on client rendering for their body content unless explicitly prerendered or marked noindex.

## Dismissed categories
- (None yet)
