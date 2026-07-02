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
- Utility/auth routes `/login` and `/register` return HTTP 200 but are marked `noindex` (robots `noindex,nofollow`, no canonical/og:url) so they do not compete in search; they still serve minimal prerendered body HTML (heading, explanatory copy, internal links) so non-JS and AI crawlers can read them.
- Client hydration preserves the server head: loading branches on the home, taxonomy, and resource pages no longer emit placeholder `Loading…`/`Error` titles, and the missing-resource branch re-asserts the server's `noindex` soft-404 contract instead of a default indexable head.
- The "Explore Categories" CTA on `/advanced` and other cross-page links are generated from the live taxonomy, so internal links cannot drift to non-existent category slugs.
- Client-rendered page titles mirror the server's og-middleware templates exactly, so Googlebot's crawl pass (initial HTML) and render pass (hydrated DOM) capture identical title/description/canonical/robots signals.

## GEO (Generative Engine Optimization)
- `client/public/robots.txt` explicitly allows 13 AI crawlers (GPTBot, ChatGPT-User, OAI-SearchBot, PerplexityBot, Perplexity-User, ClaudeBot, Claude-Web, anthropic-ai, Google-Extended, Applebot-Extended, Meta-ExternalAgent, Amazonbot, cohere-ai) with the same private-route exclusions as the default group. Per robots spec, bots matching a named group ignore the `*` group, so the Disallows are replicated there.
- `/about` carries FAQPage + BreadcrumbList JSON-LD. The 5 Q&As live in `shared/faq.ts` and are rendered identically in three places — the JSON-LD, the server-prerendered body, and the hydrated client About page — so there is no cloaking mismatch. FAQ answers use answer-first structure with concrete statistics (Princeton GEO methods).
- `client/public/llms.txt` describes the site for LLM-based agents.

## Dismissed categories
- (None yet)
