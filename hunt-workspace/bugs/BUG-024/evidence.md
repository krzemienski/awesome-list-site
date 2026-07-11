# BUG-024 — /about renders only the standard sidebar (no real "about" content)

**Severity:** HIGH (broken/empty page on a route Google indexes)
**Affected page:** https://awesome.video/about

## Reproduction
1. Open https://awesome.video/about in a fresh chromium at 1440×900.
2. The page title is "About — Awesome Video" but the body is essentially
   the standard category sidebar. No bio, no mission, no contributor list,
   no project history.
3. The META description (`"Learn about Awesome Video — the web home of
   the awesome-video curated list by Nick Krzemienski — and awesome-list-site, ..."`) promises content that isn't visible in the rendered body.

## Expected
An about page should contain: who maintains the site, the curation
philosophy, contributing / contact info, link to GitHub repo, last
updated date.

## Actual
The route renders an empty content area beside the sidebar. The
SPA defaults to a stub.

## Evidence
- `more-bugs.json`, `aboutPage.txt` — only sidebar chrome
- `screenshots/about_full.png`
- META description claim from /about is contradicted by the rendered body

## Fix prompt

```
Task: GET https://awesome.video/about renders the standard sidebar but
no actual about-page content. The page meta description promises
content ("Learn about Awesome Video — the web home of the
awesome-video curated list…") that is invisible in the rendered body.

Reproduction: load /about, evaluate text length of <main>
excluding the sidebar. Today the body is ~100 chars of intro at best.

Acceptance:
1. /about renders ≥200 words of unique content (excluding sidebar).
2. Must include: maintainer credit (Nick Krzemienski per the meta),
   curation philosophy, contribution pathway, last-updated date.
3. Verifiable: Playwright reads main.innerText length ≥1000.
```
