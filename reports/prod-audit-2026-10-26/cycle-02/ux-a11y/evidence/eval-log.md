# ux-a11y cycle 02 — eval outputs (chrome-devtools MCP, isolatedContext `ux-a11y-c2`, signed out, consent denied, umami disabled)

Revision: c25cd76f9b618e478c2db71b6e6caaf97ad5eaf4 at 16:57:05Z and 17:38:19Z.

Each line is the `document.activeElement` probe taken ~1.5 s after the real input (rf = `data-route-focus`, fv = `:focus-visible`).

## Route focus (1440, fine pointer)
- First load `/`: `BODY`, rf false (untouched).
- Header "Browse" click: `/categories` → `H1 All Categories`, rf true, outline `none`.
- Keyboard Enter on card link: `/category/community-events` → `H1 Community & Events`, rf true, fv true, outline `none 3px`.
- Sidebar subcategory link click: `/subcategory/community-groups` → `H1 Community Groups`, rf true.
- Tag pill on listing (query-only): `?tags=AOSP` → `H2#taxonomy-results-heading "1 of 58 resources match"` (page-owned results focus).
- Breadcrumb (keyboard Enter): `/category/community-events` → `H1`, rf true, outline none.
- Browser Back: `/subcategory/community-groups?tags=AOSP` → `H1 Community Groups` rf. Forward: `/category/community-events` → `H1` rf.
- Paginator Next: `?page=2` → `H2#taxonomy-results-heading "Resources (129)"`.
- Palette `/` + "shaka packager" + Enter: focusin log `BUTTON Search 3,825 resources` (dialog restore) then `H1 Shaka Packager` 104 ms later, rf true.
- Palette "View all results for hls" + Enter: `/search?q=hls` → `INPUT Search resources` value `hls` (kept).
- Search result title click: `/resource/185294` → `H1 HTTP Live Streaming (HLS)` rf.
- Resource tag `#HLS`: `/tag/hls` → `H1 HLS` rf.
- Same-page fragment `All related topics` (Enter): `#related-topics-heading`, activeElement BODY, scrollY 3443, target at top 174; next Tab → `Protocols & Transport (32)` inside the section (native sequential-focus start point).
- Back onto `/tag/hls#related-topics-heading`: scroll restored (3443) but next Tab → `Back to Home` at scrollY 0 (focus start point not at fragment; see PG-08).
- Direct load of the same hash URL: next Tab → `Protocols & Transport (32)` (native behaviour OK).
- Skip link: Tab → `A Skip to main content` 156x44 at (8,8), 2px accent ring; Enter → `MAIN#main` with ring.
- Mobile drawer 390 (touch): Toggle sidebar → drawer link "Submit": focusin `A Submit` → `H1 Add to the index` → `BUTTON Toggle sidebar` (Radix restore) → `H1 Add to the index` 4 ms later; final rf true, fv false.
- Drawer link "Slack & Meetups" 390: `/sub-subcategory/slack-meetups` → `H1 Slack & Meetups` rf.

## Slow 3G
- `/journeys` (lazy route, cold): t=0 old h1 [rf]; t=203 `BODY` busy=true h1=""; t=4433 `H1 Learning Journeys [rf]`.
- `/journey/7`: t=200 BODY busy; t=2418 title "Loading journey"; t=4433 `H1 Building Your First Streaming Platform [rf]`.
- Tab pressed during pending `/code-of-conduct` load: focus `A awesome.video` (header) kept; h1 never stole it.
- Skip-link Enter during pending `/terms` load: `MAIN` kept after render (skip link wins).
- **PG-04** `/category/encoding-codecs` → footer `/category/standards-industry`: t=200 `active=H1 Encoding & Codecs[rf] | h1=Encoding & Codecs | busy=true | title=Video Standards & Industr…`; t=2422 `active=H1 Standards & Industry[rf]`. focusin log has a single entry `H1 Encoding & Codecs` (same node, text rewritten in place).

## Rings
- Back to top (keyboard Enter, 1440): `H1 Media Tools`, rf false, fv true, `solid 2px rgb(255, 61, 82)`, scrollY 0 → `back-to-top-keyboard-ring-1440.png`.
- Account menu pointer open: active `DIV role=menu`, fv true, outline `none`. ArrowDown → `DIV role=menuitem Sign in`, `solid 2px rgb(255, 61, 82)` → `account-menu-arrowdown-item-ring-1440.png`. Escape → trigger with ring.
- Geist × Lime, 10 Tabs on `/resource/185294`: every stop ends `solid 2px rgb(170, 255, 0)` (3 stops sampled mid 0.16 s transition, re-read settled) → `geist-lime-focus-ring-search-trigger-1440.png`.

## Offline (1440)
- **PG-05** from `/category/media-tools` offline → footer `/category/intro-learning`: 25 s later `<main>` still "CATEGORY · MEDIA TOOLS / Media Tools / 704 RESOURCES", `aria-busy=true`, title "Learn Video Development…", route focus `H1 Media Tools [rf]`, no offline state → `offline-listing-stale-content-1440.png`. Reconnect → Intro & Learning renders.
- From `/about` offline → `/category/general-tools`: offline state "OFFLINE · You're offline … Retry" (`role=alert`), title "You're offline — Awesome Video", focus `H1 You're offline` rf.
- Tab → Retry; Enter offline → note "Still offline — reconnect and try again." inside the `role=alert` container; focus stays on Retry.
- **OF-01** reconnect with focus on Retry: page renders "General Tools", activeElement `BODY` (trace stays BODY for 6 s). Repeated with `/category/infrastructure-delivery`: `H1 You're offline` focused → reconnect → `BODY`.

## Contact dialog (390 touch, then 1440)
- Opens with focus in NAME; empty Submit (no send): all 4 fields `aria-invalid="true"`, messages "Name is required" / "Enter a valid email address" / "Subject is required" / "Message must be at least 20 characters", focus to NAME. Escape → focus back on "Contact maintainers". → `contact-invalid-submit-390.png`
- **PG-06** describedby before submit: `name → ":re:-form-item-description"` resolved [false] (same for replyTo, subject, message). After submit `"…-description …-message"` → [false, true].

## Target sizes (touch emulation, coarse + hover:none true)
390 and 820: home, category, subcategory, resource, search, journeys, journey/7, settings, settings/theme, about, tag, submit, privacy — 0 failures after exclusions. Exclusions observed: card titles with stretched `::after` (inset 0), Home layout radios 16x16 inside 268x80 labels, inline links in "Related:" sentence on tag page, "Open cookie settings" inline in a sentence (24px). scrollWidth = viewport on every page.

## Contrast (informational, text runs composited over effective bg)
- editorial/crimson `/`: 552 runs, min 4.7:1 ("CATEGORIES" 10px).
- editorial/violet `/settings/theme` 97 runs min 4.57; `/` 552 runs min 4.57 (black on violet button).
- geist/violet `/category/encoding-codecs` 631 runs: only <4.5 are opacity-0 hover-reveal rows (hidden at rest under fine pointer).
- geist/lime `/resource/185294`: 121 runs, min 4.96. `prefers-color-scheme: light` identical (dark-only site).

## Structure
- Every page type: 1 main, 1 banner, 1 contentinfo, lang=en, one h1, no unnamed controls, no unlabeled fields, no img without alt, no duplicate ids, no broken IDREFs (dialogs closed).
- `/submit` signed out: heading skip `h1 -> h5 "Login required to submit"`, `role=alert` on a static note (PG-07). `/journey/7` signed out: `role=alert` "Please log in to start this journey" (PG-07).
- `/subcategory/*`, `/sub-subcategory/*`: navs `breadcrumb` (sr-only, links tabIndex -1) and `Collection breadcrumb` (visible) carry the same trail (PG-09).

## Reduced motion
`prefers-reduced-motion: reduce` on `/category/media-tools`: 0 running animations, 0 transform/all transitions; Back to top Enter → scrollY 0 on the first frame, focus `H1 Media Tools` with ring.
