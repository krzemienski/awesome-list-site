# Regression watchlist from project history (awesome.video)

Scope: `git log --since=2026-05-01` (1,120 commits; 391 matched fix/bug/regress/broken/revert/audit/hotfix/broke, saved during research at /tmp/vsh-fixlog.txt), plus every commit since b4040bfe (2026-10-11, when validation tooling was removed), CHANGELOG.md, replit.md, docs/audits/functional-audit-2026-09-28.md, docs/audit-final/{BACKLOG,RELEASE-REPORT-2026-10-12}.md, docs/audit-578/STATUS.md, docs/visitor-improvements-2026-10.md, `.agents/memory/*.md` and the user auto-memory at `~/.claude/projects/-Users-nick-Desktop-awesome-list-site/memory/`.
Written 2026-10-25. Read-only research: nothing in this file was re-run in a browser for this report.

Widths: the target matrix is 1440×900 (D), 820×1180 (T) and 390×844 (P). History recorded 375, 768/1024 and 1280/1440, mapped here to P, T and D.
Sign-in: members use Clerk at `/sign-in`. The owner admin signs in at `/sign-in?admin` with OWNER_PASSWORD (`.agents/memory/clerk-auth-migration.md:6`). On a shared account, don't use the theme picker (`.agents/memory/shared-account-theme-writes.md:5`).
Example IDs below come from the history docs (for example /resource/188015, /resource/185214, /journey/7). Check that they still exist before you rely on them.

---

## 1. Watchlist table

### 1a. Counts and catalog consistency

| Area | Journey | What broke (user-visible) | Root cause | Commit / date | Browser re-check (URL, clicks, what correct looks like) | Widths |
|---|---|---|---|---|---|---|
| Counts | Browse a category from the sidebar | 241 approved resources never appeared in any category drilldown, only at their direct /resource URL | Hierarchy LEFT JOIN required a (subcategory, sub_subcategory) parent match, so mismatched rows fell out of the tree | 37861134 2026-05-20 | `/category/media-tools`: the header total equals the sidebar badge. Open the last page of the list and confirm it isn't short. | D T P(drawer) |
| Counts | Compare sidebar badges with pages | Parent badge 183 while its children summed to 44. Codecs page listed 9 while the sidebar said 15. | Two count validators, and orphan sub/sub-sub strings were dropped from sub-level sums; pages listed direct rows only | 0c03c707 2026-07-06; `.agents/memory/count-source-of-truth.md:6` | `/subcategory/codecs`: the "Showing N" total equals the sidebar badge for Codecs. Expand Encoding & Codecs in the sidebar: child rows plus "All in…"/Uncategorized sum to the category badge. | D T P |
| Counts | Category page subcategory cards | Category subcategory cards summed below the total (Players & Clients 122 vs 239 dev), and resources filed directly under the category had no card | Direct-category resources had no row or card | N-12/N-14 `docs/audit-final/BACKLOG.md:35,37`; 2349a26c 2026-10-11 | `/category/players-clients`: the subcategory cards plus the Uncategorized card add up to the header count. The sidebar rows under the category add up to its badge. | D T P |
| Counts | Narrowed listing | `?filter=general` cut a subcategory to 10 items with no visible sign (badge 67) | Scope filter was applied silently; the count heading was sr-only | N-15 `BACKLOG.md:38`; 2349a26c | `/subcategory/<slug>?filter=general` shows a visible filter chip or notice, and clearing it restores the full count | D P |
| Counts | Advanced → Explorer / Metrics | Encoding showed 120 instead of 372. "Growth Rate" read "+1949%". | Read nested `/api/awesome-list` `category.resources.length` (direct rows only); a raw count was rendered with a % suffix | user memory `advanced-explorer-tree-undercount.md:8` | `/advanced`: Explorer category counts equal the `/categories` counts. Metrics shows a plausible growth percentage, not a raw total. | D P |
| Counts | Admin overview vs public | Admin "TOTAL RESOURCES" 2109 vs public 1951 | Rejected and pending rows counted in admin aggregates | user memory `deploy-did-not-fix-count-family.md:10`; M-08 `BACKLOG.md:74` | `/admin` overview Resources tile = the sidebar footer "N indexed" = the home total. "Manage the N resources" matches. | D |
| Counts | Tag landing pages | `/tag/window` titled "Window" (Windows); video.js became "video.j"; aaos→aao, kinesis→kinesi | Plural fold stripped a final "s" and singularized dotted names | 6aaede64, 502093df 2026-10-11 (N-05, N-09 `BACKLOG.md:28,32`) | `/tag/windows` is titled "Windows" with a count. `/tag/video.js` is intact. A retired slug such as `/tag/window` 301s to the canonical. | D P |
| Counts | Explorer tag filters | Explorer tag filters disappeared although 1,047 resources had tags | Tags were read from the empty `tags` table; real tags live in `resources.metadata.tags` | H01 cbb6fff0 2026-10-10; `.agents/memory/tags-metadata-source.md:5` | `/advanced` Explorer tag filter lists many tags with counts | D P |
| Freshness | Admin approve/edit, then browse | Listings and sidebar stayed stale for up to 60 s after a correct invalidation | Catalog GETs are `max-age=60`, so the refetch was served from the HTTP cache | D06 dbea3ae9 2026-10-09; `.agents/memory/catalog-http-cache-vs-invalidation.md:5` | As admin, approve or edit a resource in `/admin`, then in the SAME tab (no reload) soft-navigate to its category. The new title/count is there at once. | D |
| Freshness | Overview tiles after actions | Pending-approval tile and digest health stayed stale | Missing invalidation | E04/E05 348e5d73 2026-10-09 (`docs/audit-578/STATUS.md`) | Approve one pending item: the Overview "Pending approvals" tile drops by one without a reload | D |

### 1b. Browsing, search and navigation

| Area | Journey | What broke | Root cause | Commit / date | Browser re-check | Widths |
|---|---|---|---|---|---|---|
| Listing | Click a card on a subcategory or sub-subcategory page | Cards only opened the external URL with a toast; no detail page or Suggest Edit | Pages rendered bespoke cards, not the shared ResourceCard | c37f266c 2026-06-05; `.agents/memory/resource-browsing-parity.md:6` | `/subcategory/codecs` and `/sub-subcategory/av1`: clicking a card title opens `/resource/<numeric id>` | D T P |
| Nav | Filter a listing, then Back | Back "does nothing" or lands on about:blank | URL-mirroring effect re-ran on popstate and overwrote the entry the user went to | 2b44a2bc 2026-09-15; `.agents/memory/url-sync-effect-popstate.md:6` | Home → `/category/encoding-codecs` → type in category search / pick a tag → Back → Back lands on Home | D P |
| Nav | Clear a listing search | `?search=` stayed in the address bar after clearing | wouter `useLocation()` is path-only, so the query diff never fired | 346bb8b4 2026-06-25; `.agents/memory/wouter-location-no-query.md:6` | Category page: type a term, then clear it. The address bar loses `?search=` and the full list returns. | D |
| Nav | Paginate, then Back/Forward | Back between `?page=` values kept the previous page's scroll (always ~700 px) | Scroll restore keyed on path-only location | N-10 175b569b 2026-10-12 | `/category/encoding-codecs` → page 2 → scroll to the bottom → page 3 → Back puts you on page 2 at the old scroll position | D P |
| Nav | Search typing on listings | Debounce rewrote the URL on mount and stripped `?page=` | Effect ran on mount | BUG-038 `CHANGELOG.md:137` | Open `/search?q=ffmpeg&page=2` directly: it stays on page 2 | D |
| Explorer | Reload or share an Explorer view | Selected tags were lost on reload, Back and shared links | Tags were component state only | N-07 f513d31d 2026-10-11 | `/advanced`: pick 2 tags + search + sort → reload: the same selection and URL `?tags=` | D P |
| Search | Search while offline | "No resources match" while offline | A paused query was rendered as empty results | 676eb5dc 2026-10-11 | DevTools offline on `/search`, type a new term: an offline card with Try again, then results resume on reconnect | D P |
| Search | Search from a category-slug URL | A phantom zero-count facet row, and the chip showed the slug | Slug was never resolved to the canonical category name | 2055f1c2 2026-10-11 | `/search?category=encoding-codecs`: chip "Category: Encoding & Codecs", real facet ticked, no 0-count row | D P |
| Search | Fast typing in a search input | Input kept 1 char and lost focus | Raw keystroke queryKey + top-level `isLoading` skeleton unmounted the input | a10706f1 2026-08-03; `.agents/memory/query-loading-remount.md:6` | Type "hls player" quickly in `/search` and in the `/admin` Resources search: full text kept, focus kept | D P |
| Search | Link with markup in `q`/`tags` | The full catalog showed silently | Pre-boot scrubber removed the param before React | 1b49c441 2026-08-03; `.agents/memory/scrubbed-params-honesty.md:6` | `/search?q=%3Cimg%3E` shows "Part of the link … was ignored". `/search?q=a%20%3C%20b` keeps the text. | D |
| Palette | ⌘K zero results and keyboard | Zero results was a dead end; two rows highlighted, so Enter opened the wrong one | No fallback list; `:hover` duplicated the cmdk selection | ccc4e26b 2026-10-23 (visitor #8); N-08 6d90f8b3 2026-10-12 | ⌘K, type "zzqxv": "No results" plus category rows. ArrowDown + Enter opens `/category/…`. With the mouse resting on a row, only one row is highlighted. | D P |
| Legacy | Old README anchor link | `/#hevc` stayed on home (new behaviour, no history yet) | Heading anchors now map to taxonomy/tag pages | 0c74b4f6 2026-10-23 | `/#hevc` replaces to `/sub-subcategory/hevc`. `/#encoding--codecs` goes to `/category/encoding-codecs`. `/#nonsense` stays on home. | D |
| 404 | Malformed IDs | `/resource/0` showed "Resource temporarily unavailable"; journey and collection had one-off states | Each page had its own not-found state | U-10 d847e5b3 2026-10-12 | `/resource/0`, `/resource/abc`, `/journey/999999`, `/collection/nope` each show the shared designed not-found page | D P |
| Visitor | Tag, sub-subcategory and resource onward links | (New 2026-10-23, no break yet) Related shortcut, "More in …" tiles, "View on GitHub" label | Bounce reduction | ccc4e26b 2026-10-23; `docs/visitor-improvements-2026-10.md:37-48` | `/tag/webassembly` shows a "Related:" row. `/resource/188015` shows "More in SRT" and "View all in Protocols & Transport". `/subcategory/effects-compositing-tools` ends with sibling tiles. Home shows a 44 px search field. | D P |

### 1c. Resource detail

| Area | Journey | What broke | Root cause | Commit / date | Browser re-check | Widths |
|---|---|---|---|---|---|---|
| Detail | Related resources | The related list was empty or linked to `/…/undefined` | Client interface didn't match the API response shape | ed3ae80f 2026-07-03; `.agents/memory/client-api-shape-drift.md:6` | `/resource/188015`: related items show titles and open `/resource/<id>`. No React key warning in the console. | D P |
| Detail | Related titles on a phone | Titles cut to about 8 chars next to the "% match" badge | Badge took the row | ccc4e26b (visitor #4) | P: `/resource/188015` related titles wrap to 2 lines at full width. D still shows "100% MATCH". | P D |
| Detail | Suggest Edit right after a hard load | A signed-in member got the "Sign in to…" toast | `isAuthenticated` is a provisional false while auth resolves | 217824b4 2026-10-13; `.agents/memory/click-time-auth-gates.md:5` | Signed in, hard-reload `/resource/185214` and click Suggest edit at once: "Checking your sign-in…", then the form. Signed out: the sign-in toast. | D P |
| Detail | First load of a resource | Content and footer jumped on load (prod CLS about 0.33) | Route Suspense fallback swapped under the prerender hold | ae764cd4 2026-10-23; `.agents/memory/hidden-fallback-cls.md:5` | Hard-load `/resource/185214` and watch: nothing jumps. Buffered `PerformanceObserver` layout-shift total stays under 0.1. | D P |
| Detail | Category chip glyph | Every detail chip showed the protocols glyph ⟁ | Hard-coded glyph | H10 cbb6fff0 2026-10-10 | A codecs resource's chip shows the Encoding glyph, not ⟁ | D |
| Detail | Thumbnail fails (GitHub OG 429) | An empty, blurred 8rem frame on cards and detail | No failure fallback | N-13 2349a26c 2026-10-11 | Cards with a broken thumbnail fall back cleanly, with no empty blurred block | D P |
| Bookmark | Remove a bookmark | The icon flipped to "Add" but the bookmark stayed in /bookmarks | `onMutate` flipped state before `mutationFn` read it, so the DELETE became a POST | 61201dad 2026-06-03; user memory `bookmark-remove-mutation-bug.md:9` | Signed in: bookmark on `/resource/:id` → `/bookmarks` shows it → remove → reload `/bookmarks`: gone | D P |
| Bookmark | Rapid toggles; focus | Rapid clicks left UI ≠ server; buttons went hard-disabled and dropped focus | Per-page duplicated toggles; `disabled` used while pending | ac40a8f5 2026-07-21; NB-022 `CHANGELOG.md:84` | Click favorite 3× quickly on a card and on detail: final UI equals the state after reload, and focus stays on the button | D P |
| Bookmark | Guest saves, then sign-in | Guest saves lost or duplicated on sign-in | Merge path | 854f4c9a 2026-08-19; U-03 `BACKLOG.md:45` | Signed out, save 2 resources → sign in: toast "… now in your account", both in `/bookmarks`, no repeat toast on reload | D |
| Bookmark | Open /bookmarks | The page crashed | Response-shape error | e7b3763e 2026-06-05 | `/bookmarks` (guest and member) renders a list or an empty state with no error boundary | D P |

### 1d. Auth and account

| Area | Journey | What broke | Root cause | Commit / date | Browser re-check | Widths |
|---|---|---|---|---|---|---|
| Auth | Signed-in page load | Pages flashed a spinner and remounted 50–400 ms after load; admin tab strip re-scrolled | Inline `component={() => …}` routes plus `queryClient.clear()` on Clerk's first observation | 0d75b087 2026-09-16; `.agents/memory/route-remount-causes.md:6` | Signed in, hard-load `/bookmarks` and `/admin#resources`: content shows once, with no spinner after it appears and no tab-strip jump | D T |
| Auth | Deep link to an admin tab while signed out | After sign-in the admin landed on the default tab | Hash lost across the sign-in round trip | E03 348e5d73 2026-10-09 | Signed out, open `/admin#researcher` → sign in → you land on `/admin#researcher` | D |
| Auth | Members on /recommendations | The guest onboarding layout flashed for members | Guest query and layout ran before auth settled | 55ecd46b 2026-10-13 | Signed in, hard-load `/recommendations`: a neutral loading state, then member cards; the guest layout never appears | D P |
| Auth | Clerk SDK lazy load | (Risk) anonymous pages no longer ship Clerk, so sign-in entry points must still load it | Deferred SDK | f9bba9b9 2026-10-12 | Signed out on `/`: open the account menu → Sign in → the Clerk card renders on `/sign-in`. `/sign-up` renders. | D P |
| Auth | Sign-in page providers | Social sign-in buttons disappeared | UI refactor dropped them | f828c29a 2026-07-10 | `/sign-in` shows the Clerk card with the expected providers. `/login` redirects to `/sign-in`. | D P |
| Auth | Home SSR | Home SSR died silently in prod ("Host must not be empty") | Clerk key was derived from the host at SSR module eval | `.agents/memory/ssr-clerk-empty-host.md:5` | View source of `/` on prod: prerendered home content, not an empty `#root` | D |
| Auth | Guest page with local state | A server 302 sent guests away from a page that has a guest mode | Server document gate ran before React | `.agents/memory/spa-guest-route-document-gates.md:6` | Signed out with guest saves, open `/favorites`/`/bookmarks`: the guest view, not a redirect loop | D |
| Account | Sign out all devices (owner) | "Unauthorized. You are still signed in" | The owner cookie is stateless and has no Clerk sessions | A-01 7b64630c 2026-10-12 | Owner on `/profile?tab=security` → Sign out all devices → signed out; `/admin` then asks for sign-in | D |
| Account | Theme save offline | "Saving theme to your account…" spun forever | React Query pauses mutations offline | A-03 bc3d72c3 2026-10-12 | Throwaway member (not a shared account), offline on `/settings/theme`, pick an accent: a "queued" message; it saves on reconnect | D P |
| Theme | Design system choices | Removed systems (Terminal/Brutalist/Swiss) must fall back to the default | Only Editorial and Geist kept | 6f1414ed 2026-10-12; `.agents/memory/two-design-systems.md:6` | `/settings/theme` offers only Editorial and Geist. Pages render in Editorial by default. | D |

### 1e. Layout and responsive

| Area | Journey | What broke | Root cause | Commit / date | Browser re-check | Widths |
|---|---|---|---|---|---|---|
| Layout | Scroll any long page | The sticky header stopped sticking app-wide | A shared wrapper had `overflow-x:hidden`, which made it a scroll container | 2462a0eb 2026-09-02; `.agents/memory/sticky-vs-overflow-hidden.md:6` | Scroll `/category/encoding-codecs` to the bottom: the header stays pinned at the top (`getBoundingClientRect().top` ≈ 0) | D T P |
| Consent | First visit with the cookie banner | The banner covered the end of the content at first paint, ate clicks on /submit, and Cookie settings couldn't reopen on a phone | Imperative padding on foreign elements; rows claiming 100vh | 43c947b7, baf2af5a, 5cd3a3c9 2026-09-02; `.agents/memory/app-shell-bottom-bar.md:6` | Fresh profile: at P the banner sits in-flow at the top. At T/D it is sticky at the bottom and doesn't cover the footer. The `/submit` button is clickable. Footer "Cookie settings" reopens it at P. | D T P |
| Submit | Submit form on a phone | Category and Tags in two ~118 px columns with names cut off | Two-column row copied from the desktop reference | 2bbd3554 2026-10-13 (`RELEASE-REPORT-2026-10-12.md:24`) | P: `/submit` Category above Tags at full width, placeholders whole. T/D side by side. | P T |
| Submit | Submit buttons | Cancel/Submit squeezed at 375 | Not stacked | a877afc6 2026-10-11 (D-05) | P: Cancel above Submit, full width, 44 px tall | P |
| Tablet | Sidebar plus drawer at tablet width | Deep-linked active leaf was off-screen; duplicate disclosure IDs | Phone-only scroll logic reused | 6cab708f 2026-09-13; `.agents/memory/tablet-dual-navigation.md:6` | T: `/sub-subcategory/av1` shows the AV1 leaf in view in the sidebar. Open the menu drawer: the same leaf is in view, and expanding one surface doesn't toggle the other. | T |
| Tablet | Sidebar footer | "1,816 indexed" was cut off with an ellipsis; status text clipped | Width at 768–1024 | d5e34bd2 2026-10-12, 57b805c9 2026-10-13 | T: the footer reads the full "N indexed" plus a live dot; error/loading status wraps | T |
| Header | Brand wordmark | The wordmark vanished at ≤1024 | `display:none` breakpoint | D-16 a7a6462a 2026-10-12 | T shows "AWESOME.VIDEO" by the logo. P (≤480) hides it by design. No horizontal scroll. | T P |
| Drawer | Mobile drawer | The close X covered the counts of rows scrolled under it; Escape dropped focus to body | Fixed X over scrolling content; focus return | D-12 2349a26c; NB-002 `CHANGELOG.md:84`; 568fc899 2026-08-03 | P: open the menu, scroll the drawer: the X scrolls away with its header. Esc closes and returns focus to the menu button. Tab stays inside the drawer while it is open. | P |
| Advanced | /advanced tabs on a phone | "Export" and "AI Recommendations" labels collided | `grid-cols-4` | ff0b4c91 2026-07-05; 54a3d62b 2026-08-03 | P: `/advanced` tab labels are readable, and the tabs and chips aren't clipped | P |
| Admin | Admin at phone/tablet | Horizontal overflow; activity feed became a scroll region | `nowrap` cells | M-10 ded63b4f 2026-10-11; 602a9b77 (`docs/audits/functional-audit-2026-09-28.md:33`) | P and T: `/admin` overview and each tab have no page-level horizontal scroll | P T |
| Dialog | Long URL in a dialog | The dialog blew out to the URL's width | Raw text in a flex anchor keeps `min-width:auto` | `.agents/memory/flex-anchor-min-width.md:6` | Admin: open a pending or edited resource with a very long URL. The dialog stays inside the viewport and the URL wraps. | P D |
| Onboarding | Onboarding finish button | "See personalized recommendations" was clipped at 375 | No wrap | R-07 `BACKLOG.md:18`; 2349a26c | P: `/onboarding`, last step: the full button label shows | P |
| Touch | Tap targets | Pagination, card actions, footer links and the drawer were under 44 px | Sizes | 825f8f85 2026-10-11; D-09 `BACKLOG.md:104` | T and P: pagination buttons, card actions and footer links measure ≥ 44 px | T P |
| Print | Print a resource, journey or bookmarks | Printed white-on-black, or blank with background graphics off | Print sheet used Canvas colours under a dark color-scheme | X-05 cc85325c 2026-10-12 | Print preview of `/resource/185214`: dark text on white paper | D |

### 1f. Loading, hydration and performance

| Area | Journey | What broke | Root cause | Commit / date | Browser re-check | Widths |
|---|---|---|---|---|---|---|
| Paint | Throttled first load | Content painted, went blank, then painted again | `createRoot` wiped the SSR content before the cards rendered | bdc038c5 2026-07-19 | Slow 4G, hard-load `/category/encoding-codecs`: content stays visible until cards replace it, with no blank frame | D P |
| Hydration | Home hydration | React #421/#419 in the console on Home (WebKit about 2 in 5 loads) | Lazy contact host and the route Suspense boundary inside the hydrated tree | 39033cb3, 70d310cd 2026-10-12; `.agents/memory/ssr-lazy-boundary-421.md:5` | Hard-load `/` 5 times (WebKit/Safari if you can): no #421/#419 or hydration warnings in the console | D P |
| Chunks | Chunk fails to load | An infinite reload loop (8 reloads in 20 s) | The one-shot reload guard was cleared on the error-free Suspense render | `CHANGELOG.md:47`; `.agents/memory/suspense-boundary-guards.md:6` | Block one route chunk in DevTools and navigate there: one auto-reload at most, then a retry card | D |
| CSP | Return visit on prod | Every inline script blocked on the second visit (/admin) | Static ETag + rotating nonce, so a 304 paired the old body with the new CSP | 5cba30f8 2026-07-15; `.agents/memory/nonce-html-no-304.md:6` | Prod: load `/admin` (or `/`), then load it again. No "Refused to execute inline script" in the console. The document is 200 no-store, never 304. | D |
| CSP | Analytics in prod | GA was dead in prod for months | A dynamically created inline bootstrap script has no nonce | `.agents/memory/csp-platform-injection.md:6` | Prod after accepting consent: `typeof gtag === "function"` and no CSP errors in the console | D |
| Recs | Guest /recommendations | "Popular picks" hung forever on skeletons | Per-resource N+1 on cold start wedged the pg pool | `.agents/memory/recommendations-endpoint-perf.md:6` | Signed out `/recommendations`: the popular list shows within a few seconds | D P |
| Dev | Dev home with a query | Dev server OOM on `/?query` | Vite `transformIndexHtml` was given the query | f452c80f 2026-10-11 | Dev only: open `/?q=x`. The page loads and the server stays up. | D |

### 1g. Journeys, submit, contact

| Area | Journey | What broke | Root cause | Commit / date | Browser re-check | Widths |
|---|---|---|---|---|---|---|
| Journey | Journey detail and completion | 18 steps with triplicated titles; "100%" in the UI but never completed | Up to 3 rows per logical step | 51a75329 2026-08-12; `.agents/memory/journey-step-data-shape.md:6` | `/journey/7`: 6 step cards. As a member, complete all of them → completed state, still there after reload. Undo works. | D P |
| Journey | Rapid step clicks with a failure | Queued completions overwrote each other; a failed write kept showing | Rollback went to the `onMutate` snapshot | B04 3e85c8b7 2026-10-10; `.agents/memory/queued-optimistic-rollback.md:6` | Member: click 3 steps quickly, reload: the same steps are checked | D |
| Journey | Anonymous journey list | Unpublished journeys leaked; rejected resources showed in steps | Public gate | B01/B02 3e85c8b7 | Signed out `/journeys`: only published journeys; step links open live resources | D |
| Submit | Duplicate URL or title | Only a "Submission Failed" toast; focus stayed on Description | 409 responses had no `fieldErrors` | U-05 5bc513b4 2026-10-12 | Member `/submit` with an existing URL: an inline error at URL and focus moves there | D P |
| Contact | Contact form | The form never reached anyone; Email not marked required | Variant unset and endpoint disabled | U-09 8e6f9906 2026-10-12; 43f87884 2026-10-24 | The contact form is visible, every field is marked required, and a submission appears in the Admin contact inbox (dev) | D P |
| Undo | Hide a recommendation, then Undo | The card stayed gone after Undo | Undo ran in an unmounted card | f57dcf5e 2026-10-08; `.agents/memory/undo-after-unmount.md:5` | Member `/recommendations`: Hide a card → Undo → the card is back in place (count the cards) | D P |

### 1h. Admin

| Area | Journey | What broke | Root cause | Commit / date | Browser re-check | Widths |
|---|---|---|---|---|---|---|
| Admin | Create/edit a category with bad input | The dialog closed and lost the typed input | `toast()` on a validation error remounted the dialog | ae93dcb3 2026-08-20; `.agents/memory/dialog-toast-remount.md:5` | `/admin#categories` → Add → submit an invalid value: an inline error, the dialog stays open, the input is kept | D P |
| Admin | Auto slug with "_" | The form rejected the slug it had just generated | `slugify` kept `_` | FA-576-01 `docs/audits/functional-audit-2026-09-28.md:20`; now `client/src/lib/utils.ts:35` maps `_`→`-` | Add category "my_category": slug `my-category`, Save succeeds (delete the scratch category afterwards) | D |
| Admin | Bulk approve/reject | 400 "Invalid resource ID" | `/:id/approve` shadowed `/bulk/approve` | user memory `audit-remediation-defects-fixed.md:12` | Select 2 pending items → Bulk approve → both approved with an honest count | D |
| Admin | Delete a resource | A 500 although the row was gone; edits destroyed | Double audit insert hit the FK; non-transactional | user memory `audit-remediation-defects-fixed.md:10`; D09 948da496 2026-10-10 | Delete a scratch resource: a success toast and the row disappears; no 500 | D |
| Admin | Any failing admin write | A bare "Internal Server Error" | 5xx bodies are masked | 8674aa18 2026-10-11; `.agents/memory/contract-500-body-masking.md` | Trigger a 409/400 (duplicate name): the message says what to fix | D |
| Admin | A tab whose read fails | Empty list or a skeleton forever, with no error | A plain `Error` bypassed ApiError handling; retry ignored failureCount | 26450e08 2026-10-11; `.agents/memory/query-retry-predicate-forever.md:6` | Offline (or abort the GET) on an admin tab: "Couldn't load … — Retry" | D |
| Admin | Job details panel | Enrichment job details showed zeros | Default fetcher reads only `queryKey[0]` | `.agents/memory/queryclient-fetcher-key0.md:6` | `/admin?jobId=48#researcher` (or an enrichment job): real counts and events | D |
| Admin | Users tab payload | bcrypt hashes in `/api/admin/users` and export-json | `db.select()` of all columns | user memory `admin-users-password-leak.md:9`; R4-019 `CHANGELOG.md:67` | `/admin#users` with DevTools Network: no `password` field in the users response | D |
| Admin | Paid AI buttons | "Analyze with AI" spent quota on the first click | No confirm step | M-02 2d538f89 2026-10-12 | Edit dialog → Analyze with AI → a confirmation appears before any request (don't confirm) | D |
| Admin | GitHub export status | Export status attributed to the wrong run | Matched by time window | cb95d500 2026-10-23; `.agents/memory/sync-history-run-matching.md` | `/admin#github`: each history row's commit SHA matches its own queue run | D |

### 1i. Analytics, consent, SEO

| Area | Journey | What broke | Root cause | Commit / date | Browser re-check | Widths |
|---|---|---|---|---|---|---|
| Analytics | Multi-page visit (prod) | Only the landing pageview was recorded (1.1–1.6 pages per session) | The SSR-hold cleanup restored saved `history.pushState` over the Replit tracker's patch | 1155fbe6 2026-10-24; `.agents/memory/umami-spa-pageviews-history-restore.md:5` | Prod (the tracker is injected only there): click through 3 pages and see 3 pageview beacons in Network. In any env, after load `history.pushState` must not be the native function if a tracker wrapped it. | D |
| Analytics | Soft-nav titles | Pageviews filed under "Loading resource(s)" or a bare "Awesome Video" | Title read about 300 ms after pushState | ccc4e26b 2026-10-23; `.agents/memory/pageview-loading-titles.md:5` | Home → click Events & Conferences: `document.title` goes straight to "Events & Conferences — Awesome Video", never "Loading resources" | D |
| Analytics | Sign-in/up conversions | Prod sent zero `logged_in`/`sign_up_completed` | One-step Clerk completions never expose an in-flight status | f037fb65 2026-10-24; `.agents/memory/clerk-conversion-detection.md:5` | Prod only, with a normal UA: one sign-in → one `logged_in`; reload → none | D |
| Consent | Withdraw consent | `_ga` cookies survived Decline | Opt-out didn't expire the identifier cookies | A-04 7d8bf1ec 2026-10-12 | Accept → footer Cookie settings → Decline: `_ga`/`_ga_*` gone from Application → Cookies; no vendor requests afterwards | D P |
| SEO | Crawl title vs hydrated title | SERP title flip-flop risk | Client and server title templates differed | f72ffae0 2026-06-26, c1a174dd 2026-07-02; `.agents/memory/seo-title-two-pass-parity.md:6` | View-source `<title>` of `/category/encoding-codecs` equals `document.title` after hydration | D |
| SEO | About page headings | About headings differed between crawler and React; Explorer search lacked a label | Drift | 47e75e05, fc5276a2 2026-10-21 | `/about` headings render; the `/advanced` Explorer search has a visible "Search categories and resources" label | D |

---

## 2. Always re-check after any change (ranked by blast radius × recurrence)

1. **Counts agree across surfaces.** On `/category/players-clients`, the sidebar badge, header total, subcategory cards plus Uncategorized, and sidebar child rows must all agree, and the sidebar footer "N indexed" must match the home total. This class broke at least 6 times: 37861134, 0c03c707, 8b37da63, N-12/14/15 via 2349a26c, Advanced undercount, admin inflation.
2. **Sticky header and consent banner layout at all three widths.** Fresh profile on `/` and `/submit`: the banner never covers content or buttons, and the header stays pinned on scroll (43c947b7, 2462a0eb, BUG-004).
3. **Card to detail from every listing type.** Category, subcategory, sub-subcategory, tag and search cards all open `/resource/<id>` (c37f266c, resource-browsing-parity).
4. **Back/Forward and scroll on listings with filters and `?page=`** (2b44a2bc, 346bb8b4, 175b569b, BUG-038).
5. **Signed-in hard load of `/bookmarks`, `/recommendations` and `/admin#<tab>`.** No guest flash, no spinner remount, and the hash tab is kept after sign-in (0d75b087, 55ecd46b, 217824b4, E03).
6. **Bookmark/favorite add → `/bookmarks` → remove → reload.** Rapid clicks converge and focus is kept (61201dad, ac40a8f5, NB-022).
7. **Clean console on hard loads of `/`, a category and a resource.** No #421/#419, no hydration warnings, no CSP "Refused" errors, no duplicate-key warnings (39033cb3, 70d310cd, 5cba30f8, R-08/R-09).
8. **Phone 390 horizontal overflow on `/`, `/submit`, `/advanced`, `/resource/:id` and `/admin`.** `document.documentElement.scrollWidth` equals `clientWidth` (2bbd3554, ded63b4f, ff0b4c91, 602a9b77).
9. **Tablet 820 navigation.** The sidebar and drawer both work, the active leaf is in view, the wordmark shows, and the footer isn't truncated (6cab708f, d5e34bd2, a7a6462a).
10. **Search: `/search?q=ffmpeg`, ⌘K palette, zero-results path, typing speed, offline card** (ddf21f64, 676eb5dc, 2055f1c2, N-08, a10706f1).
11. **Admin write freshness.** Approve or edit, then soft-navigate in the same tab: the public listing and Overview tiles update without a reload (dbea3ae9 D06, E04).
12. **Resource first-load stability.** No visible jump; the title names the page during load; related and "More in" links are present (ae764cd4, ccc4e26b, ed3ae80f).
13. **Mobile drawer at 390.** It opens, scrolls with the X moving away, traps focus, closes on Esc and returns focus (D-12, NB-002, 568fc899).
14. **Admin dialogs keep input on validation errors, and errors are specific, not "Internal Server Error"** (ae93dcb3, 8674aa18, 26450e08).
15. **Consent and analytics.** Nothing is sent before consent; Decline clears `_ga`; SPA navigation records one pageview per page on prod (A-04, 1155fbe6, csp-platform-injection).

---

## 3. Recurring classes of break and the cheapest browser check

| Class | Seen in | Cheapest check |
|---|---|---|
| **Counts disagree between surfaces** (tree vs DB, direct-only lists, rejected rows counted, orphans dropped) | 37861134, 93681649, 0c03c707, 8b37da63, 2349a26c, Advanced undercount, admin 2109 vs 1951 | Open one large category (`/category/players-clients`) and add up the visible children against the header and badge, then compare the sidebar footer, home total and admin Overview. Use one SPA document so the numbers come from the same moment. |
| **Phone layout, 375/390** (two-column rows, nowrap cells, clipped buttons, tab grids, flex text not wrapping) | 2bbd3554, a877afc6, ff0b4c91, ded63b4f, 602a9b77, R-07, flex-anchor | At 390, on every touched route, run `scrollWidth === clientWidth` in the console and look at every form row and button label in a screenshot |
| **Tablet 768–1024 (820) dual navigation** (sidebar plus drawer, wordmark, footer ellipsis) | 6cab708f, d5e34bd2, 57b805c9, a7a6462a, 54a3d62b | At 820, deep-link `/sub-subcategory/av1`; check the sidebar leaf, open the drawer and check again; read the footer |
| **Auth-pending races** (provisional `isAuthenticated=false`, guest layout before auth settles, cache clear on first Clerk observation) | 217824b4, 55ecd46b, 0d75b087, 9aff07f2 | Signed in, hard-reload the page and act within 1 s; for a sure repro, delay `GET /api/auth/user` by about 3 s with DevTools request blocking or throttling (`.agents/memory/click-time-auth-gates.md:6`) |
| **Stale data after writes** (HTTP `max-age=60` vs invalidation, tiles not invalidated) | dbea3ae9 D06, E04/E05, F06 | Do the write, then soft-navigate in the same tab (no reload) to the public surface and read the number |
| **URL ↔ state sync** (path-only wouter, popstate overwrite, component-only filter state, `?page=` stripped) | 346bb8b4, 2b44a2bc, f513d31d, 175b569b, BUG-038 | Set filters and page → reload (state kept) → Back twice (leaves the page) |
| **Hydration/SSR swaps** (#421, paint→blank→paint, CLS under the prerender hold, re-inserted LCP node, SSR silently dead) | bdc038c5, 39033cb3, 70d310cd, ae764cd4, ssr-clerk-empty-host | Hard-load with Slow 4G and the console open; buffered PerformanceObserver for `layout-shift` and LCP; view-source to confirm the prerender exists |
| **Prod-only CSP/caching** (nonce + 304, platform-injected scripts, dynamic inline bootstrap) | 5cba30f8, csp-platform-injection, A-04 | On prod, load the same page twice and filter the console for "Refused"; confirm the document response is 200 `no-store` |
| **Client shape drift / wrong fetch URL** (hand-typed interfaces, `queryKey[0]` fetcher) | ed3ae80f, 3a504bf2, R-08, queryclient-fetcher-key0 | Look for React duplicate-key warnings and links ending `/undefined`; panels showing zeros where SQL has data |
| **Silent error → empty state** (paused offline shown as "no results", plain Error bypassing ApiError, retry forever) | 676eb5dc, 26450e08, D-07, apierror-global-handler-coverage | DevTools offline (or block one GET) on the touched page: you must see an error or offline card with Retry, never "nothing here" |
| **Optimistic/undo state** (onMutate poisoning mutationFn, queued rollback, Undo after unmount) | 61201dad, ac40a8f5, 3e85c8b7, f57dcf5e | Do the action, undo or reverse it, then reload and compare against what the UI showed |
| **Analytics loss that leaves no trace in the UI** (history patch clobbered, loading titles, CSP-blocked gtag, conversion never fires) | 1155fbe6, ccc4e26b, f037fb65, csp-platform-injection | Network panel during 3 soft navigations: one pageview each with the real page title (prod for Umami) |
| **Publish didn't reach prod** | 2026-10-09 publish left prod on the parent (`.agents/memory/live-smoke-prod-revision.md:5`) | Check a behaviour marker from the change on prod, not only `/api/version` |

---

## 4. Known false positives (looked like bugs, weren't)

Check these before logging a defect. Sources: `.agents/memory/tester-finding-retractions.md:5`, `audit-cold-boot-flake.md:6`, `headless-e2e-gotchas.md:6`, user memory `agent-browser-settle-timing.md:9`, `docs/audit-final/RELEASE-REPORT-2026-10-12.md:27-32`, `docs/audit-final/BACKLOG.md` R-01/R-02.

- **Black or blank screenshot, missing landmarks, "home renders on a bad route", empty sidebar:** the capture ran before hydration. Wait about 2.5 s after load, re-snapshot refs, and confirm with a second capture method. Near-black intermediate frames on this dark-only site are capture artifacts (`agent-browser-settle-timing.md`, `headless-e2e-gotchas.md`, `filmstrip-prepaint-check.md:6`).
- **"Opening a Select jumps the page to the top":** a Playwright `locator.click()` during a smooth scroll. Real mouse clicks and keyboard Enter don't jump. Issue #20 / R-01 / R-02 were NOT-REPRODUCED (`BACKLOG.md:9-10`).
- **"Submit is broken / dead click":** the consent banner was over the button in a fresh session. Click Decline first.
- **Radix menu ArrowDown doesn't move, or palette ArrowDown stuck on result 0:** pressed too early, or debounced results reset the highlight. Wait about 600 ms / 1.5 s.
- **Focused control reports `outline 0px`:** the transition was mid-value. Trust the screenshot pixels.
- **`getByRole('dialog')` = 0 while the drawer or search is visibly open:** locator timing.
- **"Clerk card unreachable by Tab":** the stop count wrapped. Show/Hide password "no-op": the click hit the hidden pre-identifier node.
- **"Sticky header clips content" at 390:** by design. Scroll the target into view and click it.
- **"Light mode broken":** the site is dark-only by design (`dark-only-color-scheme.md:6`).
- **Listing tag pills don't navigate:** they are filter chips (`?tags=`). Only detail-page chips go to `/tag/<slug>`. Home has no resource cards. The category listing is grouped by subcategory, not newest-first.
- **Guest Favorite "opened a toast, not a dialog";** Share on mobile emulation hands off to Web Share with no toast.
- **"No toast appeared":** the capture came after the ~5 s toast closed. The toast selector is `li[data-state]`, not `ol li` (that matches the breadcrumb).
- **Admin table "has only 2 buttons":** it was still loading. Wait for a stable row count across two reads 2 s apart.
- **`cssText` page error on `/nope-xyz`:** the tester touched `/sitemap.xml` first. Curl XML docs instead of opening them in the browser (`RELEASE-REPORT:27`).
- **`/bookmarks` "timed out":** the tester's 45 s worker ceiling, not the page (`RELEASE-REPORT:29`).
- **"Building your recommendations…" before cards when signed in:** a real Claude call takes about 9 s by design.
- **A `<script>alert(1)</script>` title in contributions:** old QA data, rendered inert, so escaping works.
- **Profile h1 width 0, or recommendations blank right after a server restart:** cold boot. Reload once before debugging (`audit-cold-boot-flake.md`).
- **Dev page reloads, ERR_ABORTED or Clerk sign-in failing mid-run:** something wrote into the watched tree during the run (`vite-workspace-watch-reload.md:6`).
- **Bare-text 429 with no `Retry-After` on HTML/assets:** the Replit edge, not the app (`edge-429-triage.md:6`). Clerk's own 429s come from the dev handshake when fetched from Node (`clerk-auth-migration.md`).
- **"Prod lacks the escape-normalising 301" (`%2D` URLs):** the Google edge decodes before the app (`edge-percent-decoding.md:5`).
- **"Silent full-catalog fallback" on a markup-shaped `q`/`tags`:** the pre-boot scrubber, with a visible notice (N-11 DECIDED, `BACKLOG.md:34`).
- **`/api/__clerk` 404 in dev:** the proxy is production-only (`clerk-auth-migration.md`).
- **Umami pageviews or PostHog events missing from a headless run:** Umami drops a HeadlessChrome user agent, so use a normal UA. posthog-js also drops every event while `navigator.webdriver` is true, so override both in the `initScript`, read the bodies with `get_network_request`, and report PostHog as "emitted"; ingestion is an owner step (`../SKILL.md` Evidence). Mixpanel resends batches, so count `$insert_id` (`analytics-browser-verification.md:6`).
- **"Dead" links that are connect timeouts from a datacenter IP:** bot-blocks (`link-scan-false-positives.md:6`).
- **External QA reports that assume a Next.js app or old counts:** about a third don't reproduce. Reproduce on the live app first (`qa-report-stale-schema.md:6`).
- **Browser "offline" as proof a write failed:** an in-flight mutation can still land. Block the exact request instead (`headless-e2e-gotchas.md`).
