# VG-018 — BUG-018 (LOW): About page resource count is stale

## Root cause
The "What is Awesome Video?" FAQ answer in `shared/faq.ts` hardcoded "more than 2,300 reviewed resources" while the live catalog is 2,292 (prod) / 1,814 (dev). Additional static "2,300+" claims lived in `client/index.html` (meta/OG/Twitter descriptions + noscript fallback) and the Search page SEO description.

## Fix (dynamic, not a new hardcode)
- `shared/faq.ts`: `ABOUT_FAQS` constant → `getAboutFaqs(resourceCount?)`. The count claim renders from the live catalog total ("It publishes N,NNN reviewed resources…"), with a number-free fallback ("thousands of reviewed resources") if the count is momentarily unavailable.
- Server (`server/og-middleware.ts`): the `/about` branch already fetches the cached tree — its flat resource count now feeds `getAboutFaqs`, so the FAQPage JSON-LD, prerendered body, and hydrated DOM all carry the identical live-count sentence (no cloaking drift).
- Client (`client/src/pages/About.tsx`): consumes the same `/api/awesome-list` payload via the shared `["awesome-list-data"]` cache key (no extra network round-trip) and passes its resource count to `getAboutFaqs`.
- Static shells that cannot render live data (`client/index.html` meta ×3 + noscript, `Search.tsx` SEO description): "2,300+" → "2,000+", matching the server's existing safe-floor copy so no static surface can overstate the catalog again.

## Live evidence (dev — 3/3 PASS)
- Live API count: **1,814** (`/api/awesome-list` resources length — dev DB has 1,814 approved; prod will render its own live 2,292).
- Hydrated About page renders "It publishes 1,814 reviewed resources" — exact match with the API count.
- No "2,300" anywhere in the rendered text.
- Server-injected HTML (Googlebot UA): JSON-LD + prerendered body both carry "It publishes 1,814 reviewed resources"; stale claim absent.
- tsc --noEmit: clean.

Screenshot: `bug018-about-faq.png`.

**Verdict: PASS**
