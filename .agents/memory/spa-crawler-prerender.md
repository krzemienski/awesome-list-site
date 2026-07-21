---
name: SPA crawler/SEO prerender
description: How non-JS crawler visibility is achieved without real SSR, and why SSR can't be revived as-is.
---

# SPA crawler visibility = og-middleware prerender, NOT React SSR

Public routes are made crawler-visible by injecting prerendered semantic HTML
(heading, summary, internal links) into the `<!--app-html-->` placeholder inside
`<div id="root">`. The injector lives in `server/og-middleware.ts` (it already
buffers + rewrites the whole HTML in BOTH dev and prod); content builders are in
`server/seo-content.ts`.

**Why not real SSR:** the prod build (`vite build && esbuild server/index.ts`)
produces **no server React bundle**, and `package.json` is off-limits. The SSR
scaffolding (`client/src/entry-server.tsx`, `server/ssr-dev.ts`, `server/ssr.ts`
`handleSSR`) is **dead code** — `setupSSRDev` is never wired, `handleSSR` is a
no-op `return next()`, and `entry-server.tsx` renders the whole `<App/>` with no
wouter `ssrPath` and touches browser-only APIs. Don't try to revive it for SEO.

**Critical: do NOT set `window.__INITIAL_DATA__` / `__DEHYDRATED_STATE__`.**
`client/src/main.tsx` hydrates only when those flags exist; otherwise it uses
`createRoot().render()`, which **replaces** the injected content on boot. That
replace path is what we want — the injected markup is a static crawler/pre-JS
view, not byte-identical to React's first render, so true hydration would warn
and discard it. Keeping createRoot avoids all hydration-mismatch risk.

**Gotchas when injecting:**
- Use the **function form** of `String.replace("<!--app-html-->", () => bodyHtml)`
  — the string form interprets `$&`, `$$`, `` $` ``, `$'` in resource
  titles/descriptions.
- Inject only for `found && !meta.noindex` routes; soft-404s and auth/internal
  routes (`/login`, `/admin`, `/profile`, `/settings`, `/submit`) keep the empty
  shell.
- Escape all text and sanitize hrefs (internal must start with `/` and not `//`;
  outbound must be `http(s)` and carry `rel="nofollow noopener noreferrer"`).
  This is progressive enhancement, served identically to all clients — not
  cloaking.
- `.txt`/static files (robots.txt, llms.txt, sitemap.xml) are served from
  `client/public`; og-middleware skips any path with a file extension.
