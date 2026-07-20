# VG-046 — Sitemap has 13 undated URLs

**Verdict: PASS (fixed in code; live sitemap reflects it after republish)**

## Finding
Prod sitemap had 13 undated URLs: 8 static pages (/, /categories, /journeys,
/advanced, /about, /submit, /terms, /privacy) + 5 journey pages (/journey/6..10).

## Fix + policy
- **Journey pages now emit `lastmod`** from `learning_journeys.updated_at` —
  a real per-row date (journeys are individually authored/edited; e.g. journey 8
  edited 2026-07-17, journey 6 2026-07-18) (server/routes.ts).
- **One consistent omission policy**, documented in the sitemap code: a URL
  omits `lastmod` if and only if it has no reliable per-row change signal —
  the 8 static pages (no backing row) and, after the BUG-045 burst filter,
  resources/taxonomy nodes whose only `updated_at` is a bulk-write artifact.
  Omitting is per spec preference ("omit rather than invent").

## Live evidence (dev, July 20 2026)
Parsed every URL of http://localhost:5000/sitemap.xml:
- total=1953, dated=419, malformed=0, contradictory=0.
- All 5 journeys dated: /journey/7→2026-07-12, /journey/9→2026-07-12,
  /journey/10→2026-07-12, /journey/8→2026-07-17, /journey/6→2026-07-18 —
  matches `learning_journeys.updated_at` exactly (psql cross-check).
- Undated URLs are exactly the policy set: 8 static + 1488 burst-artifact
  resources + 38 taxonomy nodes with no reliably-dated members; other=0.

## Prod
Takes effect on republish; the original 13 will shrink to the 8 static pages
(plus policy-consistent burst-artifact omissions from BUG-045).
