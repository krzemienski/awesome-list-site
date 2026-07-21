---
name: Canonical base URL env divergence (client vs server)
description: Client SEOHead canonical base and server og-middleware canonical base come from different env vars and can disagree; noindex pages are immune because they omit canonicals.
---

# Canonical base URL divergence (client vs server)

The client `SEOHead` component computes its canonical base from `VITE_SITE_URL`
(falling back to `https://awesome.video`). The server `og-middleware` computes
canonical/og:url from its own `SITE_URL` (default `https://awesome.video`). These
are two independent env vars and can drift apart.

In the dev/workspace `.env`, `VITE_SITE_URL=https://krzemienski.github.io/awesome-list-site`
(the OLD staging repo URL). So during client hydration, any *indexable* page's
canonical resolves to the github.io URL, while the server-injected canonical for
the same page is `https://awesome.video/...`. If that stale `.env` value ever
reaches a production build, client-hydrated canonicals will contradict the
server's site-wide.

**Why it matters:** two-pass SEO parity (crawl vs render) can silently fail on
canonicals even when robots/titles match, purely due to env config — not code.

**How to apply:**
- When auditing canonical parity, check `VITE_SITE_URL` vs the server `SITE_URL`
  before suspecting the SEOHead code.
- `noindex` pages are SAFE regardless: both `SEOHead` (noindex branch) and
  `buildMetaTags` (noindex) omit the canonical entirely, so no github.io leak on
  utility/account/admin/settings routes.
- Fixing the divergence = correct/remove the stale `VITE_SITE_URL` in `.env`
  (out of scope for the indexation-controls work; filed as a follow-up).
