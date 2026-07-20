# NB-017 — SEO-hold overlay released promptly on category routes

## Fix
`client/src/main.tsx` overlay fast-path:
- Ready-selector broadened from ResourceCards only to
  `[data-testid^="card-resource"], [data-testid^="link-category-"], [data-testid^="category-card-"]`
  — category/taxonomy routes render category cards, not resource cards, so
  the overlay previously sat through the full no-card grace on those routes.
- No-card grace trimmed 600ms → 100ms (the `elapsed > 600` branch dropped).

## Live proof (Playwright, dev, July 20, 2026)
Cold `page.goto('/category/intro-learning')` (heaviest category page;
og-middleware injects SSR content for all UAs so the overlay IS created):

```json
{ "cardsAtMs": 2983, "overlayGoneAtMs": 3074, "lagMs": 91, "pass": true }
```

`#ssr-seo-hold` is removed **91ms** after the first card testid appears —
the overlay now tracks app-readiness instead of a fixed grace window.
(cardsAtMs includes cold Vite dev-server module serving; the finding is about
the overlay lag, not absolute paint time — see Run21 cold-load evidence for
prod-build timings.)
