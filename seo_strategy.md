# SEO Strategy

## In scope
- Public marketing pages
- Public resource discovery pages
- Public category, subcategory, resource, and journey pages
- Public legal and community-policy pages (`/terms`, `/privacy`, `/code-of-conduct`)
- Social sharing previews and AI crawler visibility for public pages

## Out of scope
- Authenticated dashboard and profile pages (`/profile`, `/bookmarks`)
- Admin pages (`/admin/**`)
- Utility account and settings pages (`/login`, `/register`, `/settings/theme`) except to verify they stay out of search
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
- Core discovery routes (/, taxonomy pages, resource pages, `/journeys`, and `/journey/:id`) plus `/about`, `/advanced`, and `/submit` receive server-injected semantic body HTML (headings, descriptions, and internal links) for non-JavaScript and AI crawlers.
- The indexable legal routes have route metadata and sitemap entries but still need equivalent server-injected semantic body content; this is tracked as a current scan issue.
- Utility/auth routes `/sign-in` and `/sign-up` return HTTP 200 but are marked `noindex` (robots `noindex,nofollow`, no canonical/og:url) so they do not compete in search; they still serve minimal prerendered body HTML (heading, explanatory copy, internal links) so non-JS and AI crawlers can read them.
- Utility and internal routes should prefer a consistent `noindex` contract so search engines focus on discovery pages instead of account, settings, or admin screens.
- Client hydration preserves the server head on the main discovery routes, and missing-resource branches re-assert the server's `noindex` soft-404 contract instead of a default indexable head.
- The shared title and description templates keep Advanced and Submit metadata aligned between server and client. Public H1 parity is a separate concern: the server-injected Home and Advanced headings currently differ from the hydrated headings.
- The Explore Categories CTA on `/advanced` and other cross-page links are generated from the live taxonomy, so internal links cannot drift to non-existent category slugs.

## GEO (Generative Engine Optimization)
- `client/public/robots.txt` explicitly allows 13 AI crawlers (GPTBot, ChatGPT-User, OAI-SearchBot, PerplexityBot, Perplexity-User, ClaudeBot, Claude-Web, anthropic-ai, Google-Extended, Applebot-Extended, Meta-ExternalAgent, Amazonbot, cohere-ai) with the same private-route exclusions as the default group. Per robots spec, bots matching a named group ignore the `*` group, so the Disallows are replicated there.
- The named AI groups carry the private-route exclusions, but the separate `Googlebot` group currently only allows `/` and needs those exclusions replicated; this is tracked as a current scan issue.
- `/about` carries FAQPage + BreadcrumbList JSON-LD. The shared Q&As in `shared/faq.ts` are rendered identically in the JSON-LD, the server-prerendered body, and the hydrated client About page, so there is no cloaking mismatch.
- `client/public/llms.txt` describes the site for LLM-based agents.

## Dismissed categories
- (None yet)
