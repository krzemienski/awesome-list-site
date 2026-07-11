# BUG-013 — 26 of 80 sampled resource pages have no description (data quality)

**Severity:** MEDIUM
**Affected pages:** 26 / 80 (32.5%) resource pages sampled, including
/resource/184751, /184838, /184847, /185134, /185180, /185199, /185201,
/185426, /185563, /185763, /186307, /186494, and 14 more.

## Reproduction
For each affected slug, load the page in a fresh chromium at 1440×900.
The body renders the title, but the area beneath the heading contains
no prose description — only the metadata block (category, subcategory,
tags, external-link button).

Run via Playwright:
```js
const r = await ctx.request.get(url);
const html = await r.text();
const hasDesc = /<p[^>]*class=["'][^"']*description/i.test(html); // heuristic
```

## Expected
Every entry in the curated library (1,946 items) should have a
human-readable description. The site's purpose is to help users
discover and understand each tool — a description-less entry defeats
that.

## Actual
~32% of sampled resources render no description block in the rendered
HTML.

## Evidence
- `big-resource-sweep.json`, `no_description` array (length 26)
- Crawl-derived HTML for each slug

## Fix prompt

```
Task: 26 of 80 sampled resource pages on https://awesome.video/ render
without any description prose (heuristic: the page contains <h1>
title + metadata block but no <p>/<div>/<section> with a description
class). The full list:
  /resource/184751, /184838, /184847, /185134, /185180, /185199,
  /185201, /185426, /185563, /185763, /186307, /186494, ...

Add a backfill pipeline: admin UI → Bulk edit → descriptions; or
an LLM-suggested description generator that admins can review and
approve. For each missing description, the operator should:
  (a) re-import from the upstream source, OR
  (b) write a one-paragraph summary, OR
  (c) mark the resource as "draft / needs review".

Acceptance:
1. After fix, sweeping 100 random resources shows ≥95% have a
   non-empty description block.
2. The admin dashboard surfaces a "Missing description" counter.
3. Verifiable with Playwright + the same heuristic used in
   big-resource-sweep.js.
```
