# BUG-026 — sitemap.xml only contains 6 /journey URLs despite top-nav promising "Learning Journeys"

**Severity:** LOW (SEO + content reach)
**Affected endpoint:** https://awesome.video/sitemap.xml

## Reproduction
```bash
curl -s https://awesome.video/sitemap.xml | grep -c '/journey'
```
Returns **6** — the sitemap lists only 6 journey URLs (/journey/1 through /journey/5 + maybe /journey/6 etc).

## Expected
Either the journey list is exhaustive (and the route is fully developed
with 10+ curated journeys) OR the "Learning Journeys" entry in the top
nav should not exist until the journey collection is meaningfully
populated.

## Actual
The site has a "Learning Journeys" prominent nav entry, but only ~6
journeys exist. The /journeys landing page renders essentially nothing
(see BUG-010). The user is offered a feature that doesn't yet have
content depth.

## Evidence
- `even-more.json`, `sitemap.sampleTail: ["/journey/6", "/journey/7", ...]` — only ~6 journeys in sitemap
- `even-more.json`, `journeys.links = 1` — only 1 journey link on /journeys

## Fix prompt

```
Task: The "Learning Journeys" section is shallow. /sitemap.xml lists only
6 /journey URLs and /journeys renders essentially the homepage sidebar.

Reproduction:
  curl -s https://awesome.video/sitemap.xml | grep -c '/journey'
  → 6

Acceptance (pick one):
(a) Expand the curated Journeys collection to ≥10 entries. Promote the
    feature via the /journeys page.
(b) Until (a) ships, hide /journeys + the "Learning Journeys" nav link
    behind a feature flag so users aren't pointed at a half-built
    section.
(c) Demote "Learning Journeys" from the top nav to a sub-link.

Verifiable by re-running the curl after the chosen path is applied.
```
