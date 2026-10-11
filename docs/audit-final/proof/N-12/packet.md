# N-12 — Category subcategory cards sum below the category total
Commit: dev `ab6da9f940ae994a308857bdc7b44918699fa853+workspace` (fix in the working tree on top of ab6da9f9)   Persona: guest   Browser: Chromium (Playwright, capture-only)
System/accent/width: editorial/crimson for the sweep; all five systems for the pressed state; 1440 and 375

**Status: CONFIRMED** (FIXED, independently reviewed).

## Reproduction steps
1. Open `http://127.0.0.1:5000/category/players-clients`.
2. Read the "N RESOURCES" badge under the title and add up the counts on the cards in "Subcategories".
3. Repeat for every category (slugs from `GET /api/categories`), and for Players & Clients with `?kind=libraries`, `?kind=tools` and `?kind=events`.
4. After the fix: click the **Uncategorized** card. Read the "Resources (N)" heading and the URL, then reload, press Back, press Forward, and press Enter on the card again.

## Before — what was seen
- `../N-01/category-players-clients-p1-chromium-1440.png` (on ab6da9f9): the cards read 4+1+6+29+67+3+1+5+6 = **122**, while the badge and heading read **239**. Reviewer review-n01 corroborated this independently: 122 vs 239 in dev and 330 vs 447 in production, a 117 gap in each.
- If fixed: the cards would add up to the badge.

## Root cause
`client/src/pages/TaxonomyListing.tsx` renders one card per subcategory. Resources filed directly under the category, with no subcategory, have no subcategory page, so they had no card. They were reachable only through the "Uncategorized (N)" option inside the closed "Filters & view" panel.

## Fix
- The Subcategories grid ends with an **Uncategorized** card (shown only when `generalCount > 0`). It is a button with the same tile styling. It applies exactly the existing "Uncategorized" filter, through one shared `applySelection` used by both this card and the subcategory select: same URL (`?filter=general`), analytics event and results focus. It shows `aria-pressed`, and pressing it again returns to all subcategories.
- `client/src/styles/pages/taxonomy.css`: button resets so the card matches the link tiles. The pressed state uses the design system's own `chip accent` count style plus an accent border. The border selector out-ranks every system's `.card.hoverable:hover`; my first pass lost to the hover border, see below.

## After — what was seen
All nine categories: the cards now sum to the badge, which equals the heading.

| Category | Cards sum | Badge | Uncategorized card |
|---|---|---|---|
| Community & Events | 80 | 80 | none (0 direct) |
| Encoding & Codecs | 333 | 333 | 92 |
| General Tools | 134 | 134 | 72 |
| Infrastructure & Delivery | 191 | 191 | 111 |
| Intro & Learning | 187 | 187 | 113 |
| Media Tools | 266 | 266 | 134 |
| Players & Clients | 239 | 239 | 117 |
| Protocols & Transport | 213 | 213 | 75 |
| Standards & Industry | 173 | 173 | 118 |

Under kind filters on Players & Clients: libraries 31 = 31 (Uncategorized 20), tools 2 = 2 (no Uncategorized card, 0 direct), events 0 cards = 0.

Interaction on Players & Clients: click → URL `?filter=general`, heading "Resources (117)", `aria-pressed=true`, focus moves to the results region, and the select shows "Uncategorized". Reload keeps the filter. Back → no filter, "Resources (239)". Forward → the filter again, "Resources (117)". Enter on the pressed card → no filter, "Resources (239)".

- `after-tiles-players-clients-chromium-1440.png`
  1. Shows: Players & Clients with nine subcategory cards and a tenth, "Uncategorized 117", in the same style. The badge reads "239 RESOURCES" and the heading "Resources (239)".
  2. Proves: the cards now add up to 239 (caption `tiles sum 239 | badge "239 resources" | Resources (239)`).
  3. If broken: there would be no Uncategorized card, and the sum would be 122.
  4. Unexpected: the left sidebar's child rows under Players & Clients still add up to 122. It has an "All in Players & Clients →" row, but no row for direct resources. This becomes new row **N-14**.
- `after-uncategorized-on-chromium-1440.png`: the click state ("Resources (117)", `?filter=general`). **Superseded styling:** the pointer is still over the card, and the border is the design system's grey hover border instead of the accent. That's the specificity bug fixed in the next pass. The `after-pressed-*` frames are the current styling.
- `after-pressed-brutalist-chromium-375.png`
  1. Shows: Brutalist at 375. The Uncategorized card has an amber border and an amber "117" chip, while the other cards have white borders. Below it, "Resources (117)".
  2. Proves: the pressed state is visible with the pointer away. Caption: border `rgb(255,184,77)` = accent `#ffb84d`, while the unpressed sibling is `rgb(245,245,240)`.
  3. If broken: the card would look like its unpressed siblings.
  4. Unexpected: none.
- `after-pressed-hover-swiss-chromium-1440.png`: Swiss with the pointer on the card. The border and chip stay orange (`rgb(255,122,61)` = accent), so hover no longer overrides pressed. Nothing unexpected.
- The other `after-pressed-{system}-chromium-{1440,375}.png` and `after-pressed-hover-{system}-chromium-1440.png` frames show the same accent border and `chip mono accent` in every system, measured in `capture-log.jsonl` (phase `after-pressed`).
- `after-uncategorized-off-chromium-1440.png`: after Enter on the pressed card, "Resources (239)" and the card is unpressed.
- `after-tiles-kind-libraries-chromium-1440.png`: `?kind=libraries`, with 3 cards (including Uncategorized 20) summing to the "31 RESOURCES" badge.
- No console errors and no ≥400 responses in any run. Scripts: `capture-script.mjs`, `capture-script-kind.mjs`, `capture-script-pressed.mjs`.

## Unexpected items → new rows
- **N-14** (discovered): the sidebar's child rows under a category add up to less than the category's badge (Players & Clients 122 vs 239), because direct resources have no row. There is an "All in <category> →" row.

## Reviewer verdict
**CONFIRMED** by independent reviewer `review-batch1` (own persona `__qa_test_final_review_final_r07_…` where sign-in was needed), revision `2349a26c27f732e515acdfafdf042c7f4e9b25cc+workspace`, 2026-10-11. The reviewer captured first and read this packet afterwards.
- Seen: All nine category card sums equal their badges and headings; Players & Clients is 122+117=239. Kind-filter sums are libraries 31, tools 2, events 0. Uncategorized navigation, reload, Back/Forward, and Enter toggling back to 239 work.
- Compared with this packet: Counts and navigation agree. The packet’s historical missing sidebar row is now present.
- Reviewer evidence: `review/review-players-clients.png`, `review/review-players-clients-kind-libraries.png`, `review/review-pressed-enter-off.png`, `review/review-measurements.jsonl`
