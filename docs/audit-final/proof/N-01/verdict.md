# N-01 independent review

Reviewer: **review-n01**

Reviewed as a guest, Chromium, editorial/crimson, 1440 × 1000. Independent captures were completed before reading the builder packet. No repository files were written or changed; production browsing used GET navigation and read-only SQL only.

## Commits actually seen

- Development http://127.0.0.1:5000: `ab6da9f940ae994a308857bdc7b44918699fa853+workspace`, returned by /api/version at both capture phases (ab6da9f940ae994a308857bdc7b44918699fa853+workspace). Matches the requested revision.
- Production https://awesome.video: `26450e08ba174abf77836fc36eada0e06b2e32a5`, returned by /api/version at both capture phases (26450e08ba174abf77836fc36eada0e06b2e32a5). Matches the requested revision.

## Findings

SQL used the supplied approved-resource query; development result is in sql-development.csv, production read-only executeSql result is in sql-production.json. The nine totals sum to 1,816 in development and 3,824 in production. Nav column records the category-listing sidebar badge (also matches home sidebar). There is **no left category sidebar on /categories** in either environment; its card values were read there, and sidebar values on / and the category pages. Card means the top-level /categories card, not a subcategory card.

### Development

| Category | SQL | Nav | Card | Home | Heading | Badge | Pages | Last cards | Rendered |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Community & Events | 80 | 80 | 80 | 80 | 80 | 80 | 4 | 8 | 80 |
| Encoding & Codecs | 333 | 333 | 333 | 333 | 333 | 333 | 14 | 21 | 333 |
| General Tools | 134 | 134 | 134 | 134 | 134 | 134 | 6 | 14 | 134 |
| Infrastructure & Delivery | 191 | 191 | 191 | 191 | 191 | 191 | 8 | 23 | 191 |
| Intro & Learning | 187 | 187 | 187 | 187 | 187 | 187 | 8 | 19 | 187 |
| Media Tools | 266 | 266 | 266 | 266 | 266 | 266 | 12 | 2 | 266 |
| Players & Clients | 239 | 239 | 239 | 239 | 239 | 239 | 10 | 23 | 239 |
| Protocols & Transport | 213 | 213 | 213 | 213 | 213 | 213 | 9 | 21 | 213 |
| Standards & Industry | 173 | 173 | 173 | 173 | 173 | 173 | 8 | 5 | 173 |

All nine first pages contained 24 distinct rendered resource links/cards. Rendered uses 24 × (pages − 1) + last-page cards, as requested; this is not a claim that every intermediate page was individually visited. Last-page counts were read from article.resource-card elements and checked against the full-page images.

### Production

| Category | SQL | Nav | Card | Home | Heading | Badge | Pages | Last cards | Rendered |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Community & Events | 129 | 129 | 129 | 129 | 129 | 129 | 6 | 9 | 129 |
| Encoding & Codecs | 579 | 579 | 579 | 579 | 579 | 579 | 25 | 3 | 579 |
| General Tools | 514 | 514 | 514 | 514 | 514 | 514 | 22 | 10 | 514 |
| Infrastructure & Delivery | 352 | 352 | 352 | 352 | 352 | 352 | 15 | 16 | 352 |
| Intro & Learning | 297 | 297 | 297 | 297 | 297 | 297 | 13 | 9 | 297 |
| Media Tools | 704 | 704 | 704 | 704 | 704 | 704 | 30 | 8 | 704 |
| Players & Clients | 447 | 447 | 447 | 447 | 447 | 447 | 19 | 15 | 447 |
| Protocols & Transport | 467 | 467 | 467 | 467 | 467 | 467 | 20 | 11 | 467 |
| Standards & Industry | 335 | 335 | 335 | 335 | 335 | 335 | 14 | 23 | 335 |

All nine first pages contained 24 distinct rendered resource links/cards. Rendered uses 24 × (pages − 1) + last-page cards, as requested; this is not a claim that every intermediate page was individually visited. Last-page counts were read from article.resource-card elements and checked against the full-page images.

## Images inspected

All references below are relative to this directory. Every referenced image was opened and visually examined. Separate *-paginator.png viewport captures are retained but not relied on here; the full last-page frames already show their paginator and every card.

- [review-dev-categories.png](review-dev-categories.png): all nine category-card totals, matching this environment’s SQL; no category sidebar on this route.
- [review-dev-home.png](review-dev-home.png): home category rows and sidebar totals match SQL; fixed consent/caption overlays paint mid-page in full-page captures.
- [review-dev-community-events-first.png](review-dev-community-events-first.png): Community & Events nav and title resource badge both 80; listing heading read from captured page text (some headings below viewport).
- [review-dev-community-events-last.png](review-dev-community-events-last.png): 8 cards, paginator page 4 of 4; rendered total 80.
- [review-dev-encoding-codecs-first.png](review-dev-encoding-codecs-first.png): Encoding & Codecs nav and title resource badge both 333; listing heading read from captured page text (some headings below viewport).
- [review-dev-encoding-codecs-last.png](review-dev-encoding-codecs-last.png): 21 cards, paginator page 14 of 14; rendered total 333.
- [review-dev-general-tools-first.png](review-dev-general-tools-first.png): General Tools nav and title resource badge both 134; listing heading read from captured page text (some headings below viewport).
- [review-dev-general-tools-last.png](review-dev-general-tools-last.png): 14 cards, paginator page 6 of 6; rendered total 134.
- [review-dev-infrastructure-delivery-first.png](review-dev-infrastructure-delivery-first.png): Infrastructure & Delivery nav and title resource badge both 191; listing heading read from captured page text (some headings below viewport).
- [review-dev-infrastructure-delivery-last.png](review-dev-infrastructure-delivery-last.png): 23 cards, paginator page 8 of 8; rendered total 191.
- [review-dev-intro-learning-first.png](review-dev-intro-learning-first.png): Intro & Learning nav and title resource badge both 187; listing heading read from captured page text (some headings below viewport).
- [review-dev-intro-learning-last.png](review-dev-intro-learning-last.png): 19 cards, paginator page 8 of 8; rendered total 187.
- [review-dev-media-tools-first.png](review-dev-media-tools-first.png): Media Tools nav and title resource badge both 266; listing heading read from captured page text (some headings below viewport).
- [review-dev-media-tools-last.png](review-dev-media-tools-last.png): 2 cards, paginator page 12 of 12; rendered total 266.
- [review-dev-players-clients-first.png](review-dev-players-clients-first.png): Players & Clients nav and title resource badge both 239; listing heading read from captured page text (some headings below viewport).
- [review-dev-players-clients-last.png](review-dev-players-clients-last.png): 23 cards, paginator page 10 of 10; rendered total 239.
- [review-dev-protocols-transport-first.png](review-dev-protocols-transport-first.png): Protocols & Transport nav and title resource badge both 213; listing heading read from captured page text (some headings below viewport).
- [review-dev-protocols-transport-last.png](review-dev-protocols-transport-last.png): 21 cards, paginator page 9 of 9; rendered total 213.
- [review-dev-standards-industry-first.png](review-dev-standards-industry-first.png): Standards & Industry nav and title resource badge both 173; listing heading read from captured page text (some headings below viewport).
- [review-dev-standards-industry-last.png](review-dev-standards-industry-last.png): 5 cards, paginator page 8 of 8; rendered total 173.
- [review-prod-categories.png](review-prod-categories.png): all nine category-card totals, matching this environment’s SQL; no category sidebar on this route.
- [review-prod-home.png](review-prod-home.png): home category rows and sidebar totals match SQL; fixed consent/caption overlays paint mid-page in full-page captures.
- [review-prod-community-events-first.png](review-prod-community-events-first.png): Community & Events nav and title resource badge both 129; listing heading read from captured page text (some headings below viewport).
- [review-prod-community-events-last.png](review-prod-community-events-last.png): 9 cards, paginator page 6 of 6; rendered total 129.
- [review-prod-encoding-codecs-first.png](review-prod-encoding-codecs-first.png): Encoding & Codecs nav and title resource badge both 579; listing heading read from captured page text (some headings below viewport).
- [review-prod-encoding-codecs-last.png](review-prod-encoding-codecs-last.png): 3 cards, paginator page 25 of 25; rendered total 579.
- [review-prod-general-tools-first.png](review-prod-general-tools-first.png): General Tools nav and title resource badge both 514; listing heading read from captured page text (some headings below viewport).
- [review-prod-general-tools-last.png](review-prod-general-tools-last.png): 10 cards, paginator page 22 of 22; rendered total 514.
- [review-prod-infrastructure-delivery-first.png](review-prod-infrastructure-delivery-first.png): Infrastructure & Delivery nav and title resource badge both 352; listing heading read from captured page text (some headings below viewport).
- [review-prod-infrastructure-delivery-last.png](review-prod-infrastructure-delivery-last.png): 16 cards, paginator page 15 of 15; rendered total 352.
- [review-prod-intro-learning-first.png](review-prod-intro-learning-first.png): Intro & Learning nav and title resource badge both 297; listing heading read from captured page text (some headings below viewport).
- [review-prod-intro-learning-last.png](review-prod-intro-learning-last.png): 9 cards, paginator page 13 of 13; rendered total 297.
- [review-prod-media-tools-first.png](review-prod-media-tools-first.png): Media Tools nav and title resource badge both 704; listing heading read from captured page text (some headings below viewport).
- [review-prod-media-tools-last.png](review-prod-media-tools-last.png): 8 cards, paginator page 30 of 30; rendered total 704.
- [review-prod-players-clients-first.png](review-prod-players-clients-first.png): Players & Clients nav and title resource badge both 447; listing heading read from captured page text (some headings below viewport).
- [review-prod-players-clients-last.png](review-prod-players-clients-last.png): 15 cards, paginator page 19 of 19; rendered total 447.
- [review-prod-protocols-transport-first.png](review-prod-protocols-transport-first.png): Protocols & Transport nav and title resource badge both 467; listing heading read from captured page text (some headings below viewport).
- [review-prod-protocols-transport-last.png](review-prod-protocols-transport-last.png): 11 cards, paginator page 20 of 20; rendered total 467.
- [review-prod-standards-industry-first.png](review-prod-standards-industry-first.png): Standards & Industry nav and title resource badge both 335; listing heading read from captured page text (some headings below viewport).
- [review-prod-standards-industry-last.png](review-prod-standards-industry-last.png): 23 cards, paginator page 14 of 14; rendered total 335.

## Unexpected observations / candidate backlog rows

- **N-12 corroborated:** Players & Clients subcategory tiles sum to 122 versus category total 239 in development, and 330 versus 447 in production. That is a 117 gap in each environment. The discrepancy is between subcategory tiles and the category total, not between top-level nav and listing; this review does not independently establish the repository placement algorithm or the SQL classification of those 117 rows.
- **N-13 corroborated, now identified:** development last-page sweep recorded one browser console error and one external 429 GET from opengraph.githubassets.com for streamband/hydra-srt. The full request URL is retained in dev-last.json and capture-log.jsonl. No app-origin 4xx/5xx, page exceptions, or other console errors were observed. Development emits the standard Clerk development-key warnings; production first and last sweeps had no console warnings/errors or 4xx/5xx responses.
- /categories does not have the left category nav described by reproduction step 2; nav comparison was still possible on home and all nine listing pages. Not a counts regression.
- Consent banner and fixed capture caption can obscure a narrow horizontal strip in full-page images. Card boundaries and paginator remain visible; DOM text/card readings supplement the frames.

## Verdict

VERDICT: CONFIRMED

The builder’s NOT-REPRODUCED conclusion for issue #18 is independently confirmed on both specified revisions. All nine SQL, nav, category-card, home, listing-heading, title-badge and calculated rendered totals agree in each environment. Players & Clients reads 239 throughout development (10 pages, 23 last-page cards) and 447 throughout production (19 pages, 15 last-page cards), not the historical 221-versus-135 mismatch. My values agree with the packet’s entire top-level table. I also reproduced its separate subcategory-sum gap and external 429 observation, identifying the latter’s host/resource; neither invalidates N-01. The packet’s source-code root-cause narrative, historical fix attribution and zero-orphan claims were not independently audited by this UI/count review.
