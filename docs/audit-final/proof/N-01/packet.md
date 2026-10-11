# N-01 — Issue #18: nav, overview, category header and listing totals disagree
Commit: dev `ab6da9f940ae994a308857bdc7b44918699fa853+workspace`; production `26450e08ba174abf77836fc36eada0e06b2e32a5` (both from `/api/version`)   Persona: guest   Browser: Chromium (Playwright, capture-only)
System/accent/width: editorial/crimson; 1440

**Status: NOT-REPRODUCED — CONFIRMED** by independent reviewer review-n01 on the current code, in development and on https://awesome.video.

## Reproduction steps
1. Get the truth: run `select c.name, count(r.id) filter (where r.status='approved') from categories c left join resources r on r.category=c.name group by c.name order by c.name;` against the database (public resources have status `approved`). Note the 9 numbers.
2. Open `http://127.0.0.1:5000/categories`. Read the "N resources" line on each of the 9 category cards. (`/categories` has no left category sidebar; read the sidebar badges on `/` and on each category page in steps 3–4.)
3. Open `/`. Read the count on each category row of the home overview.
4. For each category, open `/category/<slug>` (slugs from `GET /api/categories`). Read the "N RESOURCES" badge under the title, the "Resources (N)" heading above the cards, and the nav badge for that category (scroll the nav to it).
5. On the same page note the number of pages in the paginator, open `?page=<last>`, and count the cards there. Rendered total = 24 × (pages − 1) + cards on the last page.
6. Repeat 2–5 on `https://awesome.video` (read-only) and compare with the same query run against the production database.

## Before — what was seen
Issue #18 (filed 2026-05-20, "Left nav counts off"): *"Player & Clients" shows 221 items in the overview but there's 135 entries when you view the list (other groups too)*. That 221-vs-135 gap no longer appears anywhere. Every surface now reads the same number, and it equals SQL.

| Category | SQL dev | Nav | /categories card | Home | "Resources (N)" heading | Rendered cards (pages) | SQL prod | Prod: nav = card = home = heading = rendered |
|---|---|---|---|---|---|---|---|---|
| Community & Events | 80 | 80 | 80 | 80 | 80 | 80 (4) | 129 | 129 |
| Encoding & Codecs | 333 | 333 | 333 | 333 | 333 | 333 (14) | 579 | 579 |
| General Tools | 134 | 134 | 134 | 134 | 134 | 134 (6) | 514 | 514 |
| Infrastructure & Delivery | 191 | 191 | 191 | 191 | 191 | 191 (8) | 352 | 352 |
| Intro & Learning | 187 | 187 | 187 | 187 | 187 | 187 (8) | 297 | 297 |
| Media Tools | 266 | 266 | 266 | 266 | 266 | 266 (12) | 704 | 704 |
| Players & Clients | 239 | 239 | 239 | 239 | 239 | 239 (10) | 447 | 447 (19 pages) |
| Protocols & Transport | 213 | 213 | 213 | 213 | 213 | 213 (9) | 467 | 467 |
| Standards & Industry | 173 | 173 | 173 | 173 | 173 | 173 (8) | 335 | 335 |

Totals: dev 1,816 approved with 0 orphans (category not in the taxonomy); production 3,824 with 0 orphans. The header search box reads "Search 1,816 resources…" (dev) and "Search 3,824 resources…" (prod). SQL output: [sql-truth.md](sql-truth.md). The production query was run read-only through the Replit database tool rather than screenshotted from the database pane; its output is recorded verbatim there. Raw readings: `capture-log-dev.jsonl`, `capture-log-prod.jsonl`.

- `category-players-clients-p1-chromium-1440.png`
  1. Shows: `/category/players-clients` scrolled to the results. The left nav has "Players & Clients · L3 · 239" highlighted, the main column reads "Resources (239)", and the first six cards (AVPlayer … Amazon Kinesis Video Streams WebRTC SDKs) are shown.
  2. Proves: the nav badge 239 and the listing heading 239 are in one frame and equal SQL (239). The caption reads `api=239 heading="Resources (239)" cardsP1=24 pages=10`.
  3. If broken: the nav badge and the heading would show different numbers (the issue's 221 vs 135 pattern).
  4. Unexpected: see N-12 below (the subcategory cards above the results add up to less than 239).
- `category-players-clients-last-chromium-1440.png`
  1. Shows: `?page=10`, the last row of cards (OTT Multiview, Phils Players), and the paginator "Previous 1 … 9 10 Next · Page 10 of 10".
  2. Proves: page 10 holds 23 cards, so 9 × 24 + 23 = 239 cards are actually rendered, equal to the heading and nav. Caption: `page 10: 23 cards → rendered total 239`.
  3. If broken: the last page would make the rendered total differ from 239 (for example, a list that ends early).
  4. Unexpected: none.
- `prod-category-players-clients-last-chromium-1440.png`: production `?page=19`, "Page 19 of 19" with 15 cards (18 × 24 + 15 = 447). The nav reads Community & Events 129 and Encoding & Codecs 579, and the search box reads 3,824. All equal production SQL. If broken, the rendered total would not equal 447. Nothing unexpected.
- `overview-categories-chromium-1440.png`: the "All Categories" grid with 9 cards (80, 333, 134, 191, 187, 266, 239, 213, 173 resources). The footer reads "1,816 · 9 categories · 92 subcategories"; SQL has 92 subcategories. If broken, a card would differ from SQL. Unexpected: in this full-page capture the fixed consent banner and caption are painted mid-page. That's a capture artifact of fixed elements in a full-page screenshot, not the app.
- `overview-home-chromium-1440.png` and the `prod-overview-*` frames: the same numbers on home and the production overview.
- The other `category-<slug>-{p1,last}-chromium-1440.png` and `prod-category-*` frames: one pair per category, with the same reading in each caption.

## Root cause
None on the current code. The counts now all come from complete trees. The nav and home overview are built from one nav tree in `server/repositories/HomeNavRepository.ts:140-235`, where every approved resource is placed exactly once (sub-subcategory, else subcategory, else directly under the category). A resource whose sub-subcategory name isn't in the taxonomy folds into its subcategory instead of disappearing. The one such resource in dev, "Eyevinn WebRTC Player" (sub-subcategory "Web Players" under "Web Players"), is counted under Players & Clients → Web Players, and the category total stays 239. The category listing and `/api/categories` count the same `status='approved'` rows by category, so they equal the nav at every top-level category. The current placement logic arrived with commit `d11775ec` (2026-09-15). No separate fix commit for #18 is recorded.

## After — what was seen
No code change was needed, so the BEFORE frames above are also the AFTER state on `ab6da9f9`.

## Unexpected items → new rows
- **N-12** (discovered): the subcategory cards on a category page add up to less than the category total, because resources filed directly under the category have no card. Players & Clients: cards sum to 122 against 239 in dev, and 330 against 447 in prod (117 direct in both). A visitor adding up the cards sees the same kind of gap #18 described.
- **N-13** (discovered): one `429` console error from a host other than the app during the 22-page dev sweep. It didn't recur in an 8-page probe or in the production sweep. The capture helper now records every ≥400 response from any host so the next sweep names it.

## Reviewer verdict
**CONFIRMED** by review-n01 ([verdict.md](verdict.md)). It captured independently, as a guest in Chromium at 1440 × 1000, before reading this packet. It saw `ab6da9f9…+workspace` (dev) and `26450e08…` (prod) from `/api/version`. In both environments, all nine SQL, sidebar, card, home, heading, title-badge and rendered totals agree, and its values match this packet's whole table. Its SQL outputs are `sql-development.csv` and `sql-production.json`, its frames `review-*.png`, and its raw readings `review-capture-log.jsonl`.

The reviewer corrected step 2: `/categories` has no left sidebar (fixed above). It corroborated N-12 (122 vs 239 dev, 330 vs 447 prod) and identified N-13's host (`opengraph.githubassets.com`, streamband/hydra-srt thumbnail). It did not independently audit the root-cause narrative, the fix attribution or the zero-orphan claim.
