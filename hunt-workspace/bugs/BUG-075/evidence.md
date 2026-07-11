# BUG-075 — /journeys page meta description promises content not rendered

**Severity:** LOW (SEO)
**Affected page:** /journeys

## Reproduction
```bash
curl -s https://awesome.video/journeys | grep -E '<meta name="description"|<title>'
```
Returns:
- title: "Learning Journeys — Awesome Video"
- description: "Guided multi-step learning paths for video development — from beginner streaming to advanced encoding pipelines."

But the rendered body shows essentially no journeys (BUG-010 and BUG-034).

## Expected
Either:
- The page actually renders ≥1 curated journey list
- OR the meta description is rewritten to match reality (e.g., "Explore curated learning paths for video development on Awesome Video — coming soon.")

## Actual
The meta promises curated content; the page renders almost nothing.

## Evidence
- `contrast-seo-vuln.json`, `seo[].url = /journeys` shows description
- `more-bugs.json`, `journeysInsight.txt`

## Fix prompt

```
Task: /journeys meta description promises curated learning paths but
the rendered body has none. Either populate the page OR rewrite the
description to reflect reality.

Acceptance:
1. Either /journeys renders ≥3 journey cards, or the meta description
   is updated to read "coming soon" or similar.
2. Verifiable via curl + Playwright.
```
