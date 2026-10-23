# Visitor improvements — October 2026

Goal: get more first-time visitors (mostly from Google) to a second page or out
to a listed resource.

## What the data said

Replit Analytics, 7 days to 2026-10-23, bot countries (CN, SG, MX, HK) excluded.

| Landing type      | Sessions | Single-page |
| ----------------- | -------: | ----------: |
| Resource page     | 400      | 360 (90%)   |
| Home              | 108      | 56 (52%)    |
| Tag page          | 47       | 46 (98%)    |
| Subcategory       | 24       | 17 (71%)    |
| Sub-subcategory   | 11       | 9 (82%)     |
| Category          | 8        | 5 (63%)     |

- Resource landers bounce on both devices: phone 83 of 94, laptop 208 of 232.
  Top landers: the Widevine L3 decryptor page (29 of 30 bounced) and P2P
  Streaming (16 of 19).
- When resource landers did continue, they went to `/search` (18), home (16), a
  category (8) or another resource (~9).
- Events: `resource_link_opened` 17 (15 to github.com), `related_resource_opened`
  4, `resource_card_opened` 6, `search_performed` 2 (both from the palette),
  `command_palette_opened` 2.
- Page titles recorded for pageviews included "Loading resource" (28),
  "Loading resources" (27 across taxonomy pages) and a bare "Awesome Video"
  (61). Soft-navigation pageviews are recorded about 300 ms after the URL
  changes, while the page is still loading, so these sessions are reported
  under a generic title instead of the page's name.
- Traffic: google 357 sessions, direct 222; laptop 370, phone 142.

## The 10 changes

Each change uses existing design-system components and tokens (Button, Input,
Badge, `.chip`, `.card.hoverable`, the taxonomy tile classes, the palette rows).
No new analytics events were added. The one new link reuses the existing
`related_category_opened` event and sends only the collection name.

| # | Change | Evidence behind it | Verified (1440×900 / 390×844) |
| - | ------ | ------------------ | ----------------------------- |
| 1 | **Tag pages: "Related:" shortcut under the intro.** It shows up to 3 related tags, the main category, and a jump link to the full related-topics section. The bottom section is unchanged, so it still matches the crawler HTML. | 46 of 47 tag landers left after one page. On a phone, the related topics only appeared after 24 cards and the paginator. | `/tag/webassembly`: the shortcut shows #FFMPEG, #Tutorial, #Video Decoding, Intro & Learning, and All related topics. On laptop, clicking #FFMPEG opened `/tag/ffmpeg`. On phone, "All related topics" scrolled to the section heading (81 px from the top, clear of the header). |
| 2 | **Taxonomy loading title names the collection.** While the listing loads, the title is "Events & Conferences — Awesome Video" instead of "Loading resources". | "Loading resources" was recorded for 27 taxonomy pageviews. | Soft navigation from home to Events & Conferences produced these titles in order: "Events & Conferences — Awesome Video", then the final title. "Loading resources" never appeared. |
| 3 | **Page-load fallback title names the page.** While a page's code loads, category pages take their name from the cached navigation tree and resource pages take theirs from any list that already contained the resource. Other routes keep the brand title. The server-rendered title on first paint is never replaced. | "Loading resource" was recorded 28 times. A bare "Awesome Video" was recorded 61 times: 43 on subcategory and resource pages, which this change covers, and 18 on home, which it does not. | Clicking a card on `/subcategory/effects-compositing-tools` went straight to "Anime4K — Awesome Video", with no generic title in between. Same result from a related item on a resource page. |
| 4 | **Phone: related-resource titles are readable.** Titles get the full row and wrap to 2 lines. The "% match" badge shows from the `sm` breakpoint up, and the placeholder rows match. | On a 390 px screen, related titles were cut to about 8 characters ("widevine…") next to the badge. There were only 4 `related_resource_opened` events in a week. | Phone, `/resource/188015`: "SRT CookBook - Projects and Applications" wraps to 2 lines at full width, and the other titles show in full. Laptop is unchanged and still shows "100% MATCH" badges. |
| 5 | **Resource page: "More in {closest collection}" link.** It sits above "View all in {category}" and points to the sub-subcategory, or the subcategory if there is none. Reserved space keeps the card from jumping while the tree loads. | Category was a destination for only 8 of the resource landers who continued. The only browse link went to the broad category. | `/resource/188015` shows "More in SRT" (`/sub-subcategory/srt`) and "View all in Protocols & Transport" at both sizes. |
| 6 | **Primary button names its destination.** It reads "View on GitHub", "View on GitLab" or "Open on {domain}" instead of "Open resource". | 15 of 17 outbound opens went to github.com. The old label didn't say where the button leads. | "View on GitHub" on srtdroid. "Open on multicorewareinc.com" on x266 fits in one line on phone (254 px wide, content 252 px). |
| 7 | **Subcategory and sub-subcategory pages: "More in {parent}" tiles.** These sit after the paginator. They list up to 8 non-empty siblings with counts, plus an "All of {parent}" tile. | 17 of 24 subcategory landers and 9 of 11 sub-subcategory landers left after one page. Below the `lg` breakpoint the sidebar of siblings is hidden, so on phone the page ended at the paginator. | Phone, `/subcategory/effects-compositing-tools`: 8 Media Tools siblings plus "All of Media Tools". Tapping Audio & Subtitles opened it at the top of the page. Phone, `/sub-subcategory/hevc`: AV1, VP9 and All of Codecs. Laptop, `/subcategory/events-conferences`: two tiles under the paginator. |
| 8 | **Search palette: zero results offers the "Jump to" list.** When nothing matches, the palette shows the same categories and featured items as the empty palette, instead of a dead end. | Both `search_performed` events came from the palette. The no-result state only said "Try different keywords". | Typing "zzqxv" shows "No results", then 5 category rows at both sizes. ArrowDown + Enter opened `/category/encoding-codecs`. |
| 9 | **/search with no results: popular-category chips.** It shows the 6 largest categories with counts, above the existing Clear / Browse / Advanced buttons. | `/search` was the most common second page for resource landers (18). Its empty state offered no specific destinations. | `/search?q=zzqxv` shows Encoding & Codecs 333, Media Tools 266, Players & Clients 239, Protocols & Transport 213, Infrastructure & Delivery 191 and Intro & Learning 187. The chips wrap cleanly on phone. |
| 10 | **Home: a visible search field under the title** (index layout, the default). Its loading skeleton reserves the same 44 px row. | 56 of 108 home landers left after one page. On phone the only search entry point was the header icon. | Visible at both sizes. On laptop it is 576 × 44 px under `~/awesome.video`. On phone, typing "hls player" and pressing Enter opened `/search?q=hls%20player` with 30 results. |

## Not changed (owned elsewhere or deliberately left)

- Resource-page speed and layout shift, sign-in, 404s, tracking, guide/Events
  filters and the sidebar "live" label are handled by other tasks.
- The empty "TAGS" block on resources without tags stays, because it matches
  the crawler HTML.
- No sidebar was added to resource pages: the empty right column on laptop
  overlaps the layout-shift work.

## How it was checked

- Checks: `tsc --noEmit` was clean. ESLint error counts per changed file were
  the same before and after the change.
- Browser checks: every row was driven in a real headless Chrome against the
  dev server at 1440×900 and 390×844. The page title sequences were read from
  the live document during soft navigation.
- Still to confirm: production numbers. The effect on bounce rate will show up
  in the same 7-day query after publishing.
