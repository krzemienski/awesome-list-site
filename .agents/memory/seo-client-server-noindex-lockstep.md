---
name: Client SEOHead noindex must mirror server route noindex
description: Any route the server marks noindex/no-canonical must also pass noindex to the client SEOHead, or hydration adds a contradictory indexable robots + self-canonical.
---

Any page whose server route (og-middleware) emits `robots: noindex,nofollow` +
no canonical must render its client `SEOHead` with the `noindex` prop (or render
no SEOHead at all, like `/login`).

**Why:** react-helmet only removes/replaces the tags it owns (`data-react-helmet`).
The server's noindex meta therefore persists, but a *default* (indexable) client
SEOHead ALSO appends `robots: index,follow` + a self-canonical the server
deliberately omitted. Google takes the most-restrictive robots directive (so
noindex still wins), but the extra self-canonical is a contradictory crawl signal.
Both crawl and render passes should agree.

**How to apply:** for every static route flagged `noindex` in og-middleware
`staticRoutes` (e.g. `/register`, `/recommendations`, `/search` need the prop;
`/login` is fine because it renders no SEOHead) and every dynamic soft-404
(missing resource/journey → noindex SEOHead or no SEOHead), verify with a
two-pass crawl(curl)-vs-render(Playwright) check that robots + canonical match.
Missing-entity and utility pages must stay noindex + no canonical AFTER hydration,
not just in the server HTML.
