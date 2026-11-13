# Production interaction inventory

Source SHA under audit: `130e582957e22909bc77a6d219af7bd689854210`. Normalized from the measured cycle-6 inventories; all 760 rows must end PASS, FAIL with remediation, or an explicitly recorded policy/owner BLOCK.

| ID | Lane | Surface | Interaction | Trigger | API dependency | Priority (P0/P1/P2) |
|---|---|---|---|---|---|---|
| C6-PC-001 | ux-public-core | Global shell | Bootstrap identity, public config and navigation | /api/auth/user, /api/config, /api/awesome-list/nav | P2 |
| C6-PC-002 | ux-public-core | Header | Activate AWESOME.VIDEO brand | UI/client state; no direct API named | P0 |
| C6-PC-003 | ux-public-core | Header/drawer | Toggle sidebar; close by link, backdrop and Escape | UI/client state; no direct API named | P0 |
| C6-PC-004 | ux-public-core | Header search | Open palette by button, Ctrl/Cmd+K and `/` outside fields | UI/client state; no direct API named | P0 |
| C6-PC-005 | ux-public-core | Header primary nav | Use Browse, Submit, About, Docs and conditional Admin | UI/client state; no direct API named | P0 |
| C6-PC-006 | ux-public-core | Account menu, guest | Open Sign in, Theme Settings and Saved resources | UI/client state; no direct API named | P0 |
| C6-PC-007 | ux-public-core | Account menu, member | Open Profile, Bookmarks, Notifications, Settings, Theme, conditional Admin, Sign out | /api/notifications?limit=50 | P2 |
| C6-PC-008 | ux-public-core | Sidebar navigation | Use Home and More navigation links | UI/client state; no direct API named | P0 |
| C6-PC-009 | ux-public-core | Sidebar taxonomy | Expand/collapse a category and choose All in category | UI/client state; no direct API named | P0 |
| C6-PC-010 | ux-public-core | Sidebar taxonomy | Open subcategory and nested disclosure | UI/client state; no direct API named | P0 |
| C6-PC-011 | ux-public-core | Sidebar taxonomy | Choose sub-subcategory and Uncategorized links | UI/client state; no direct API named | P0 |
| C6-PC-012 | ux-public-core | Compact rail | Collapse/expand rail; use Home, category and source icons | UI/client state; no direct API named | P0 |
| C6-PC-013 | ux-public-core | Mobile drawer | Submit search and use Home/Submit/About/Admin/More links | UI/client state; no direct API named | P0 |
| C6-PC-014 | ux-public-core | Sidebar data states | Load nav; retry nav failure; render genuine empty tree | /api/awesome-list/nav | P2 |
| C6-PC-015 | ux-public-core | Breadcrumbs | Use screen-reader breadcrumb links and resource ancestor disclosure | UI/client state; no direct API named | P2 |
| C6-PC-016 | ux-public-core | Back to top | Scroll past 600px and activate Back to top | UI/client state; no direct API named | P0 |
| C6-PC-017 | ux-public-core | Footer navigation | Use footer Home and category links | UI/client state; no direct API named | P2 |
| C6-PC-018 | ux-public-core | Footer source links | Open repository, PRs welcome, docs and Issues | UI/client state; no direct API named | P0 |
| C6-PC-019 | ux-public-core | Footer policy/contact | Open About, Terms, Privacy, Conduct, Sitemap, Cookie settings and conditional contact links | /api/config | P0 |
| C6-PC-020 | ux-public-core | Analytics consent | Accept, Decline, open Privacy, dismiss with Escape, reopen settings | UI/client state; no direct API named | P0 |
| C6-PC-021 | ux-public-core | Search palette | Close via Escape, close button, Ctrl/Cmd+K and navigation | UI/client state; no direct API named | P0 |
| C6-PC-022 | ux-public-core | Empty search palette | Choose category, featured resource and page jumps | /api/categories, /api/home | P2 |
| C6-PC-023 | ux-public-core | Search palette results | Query and choose resource, category, page or View all | /api/resources?search=…&page=1&limit=24 | P0 |
| C6-PC-024 | ux-public-core | Recent searches | Select recent query and Clear recents | UI/client state; no direct API named | P0 |
| C6-PC-025 | ux-public-core | Palette states | Trigger loading, error/Retry, offline, no results, over-limit and auxiliary failures | UI/client state; no direct API named | P2 |
| C6-PC-026 | ux-public-core | `/` Home data states | Load index/curated home and recover failures | /api/home, /api/awesome-list/nav, /api/awesome-list, /api/resources/kinds/counts | P2 |
| C6-PC-027 | ux-public-core | Home layout | Switch Index/Curated via preference or `?layout=` | /api/user/preferences | P0 |
| C6-PC-028 | ux-public-core | Home search | Submit visible catalog search with blank and nonblank queries | UI/client state; no direct API named | P0 |
| C6-PC-029 | ux-public-core | Home kind strip | Toggle Tools, Libraries, Standards, Events and Protocols | /api/resources/kinds/counts | P0 |
| C6-PC-030 | ux-public-core | Home tag/sort filters | Open tag popover, search/select tags, sort, remove chips and Clear all | UI/client state; no direct API named | P0 |
| C6-PC-031 | ux-public-core | Home category index | Open category, subcategory and +N more links | UI/client state; no direct API named | P0 |
| C6-PC-032 | ux-public-core | Home resource cards | Open title/details and external Open Link | UI/client state; no direct API named | P0 |
| C6-PC-033 | ux-public-core | Home resource tags | Activate tag pill and +N more/Show fewer | UI/client state; no direct API named | P0 |
| C6-PC-034 | ux-public-core | Home rail and CTAs | Open recent/featured cards and Submit resource | UI/client state; no direct API named | P2 |
| C6-PC-035 | ux-public-core | Home account context | Use Continue setup, Not now, recommendation heading, sign-in and Browse recommendations | UI/client state; no direct API named | P0 |
| C6-PC-036 | ux-public-core | `/categories` | Change sort among A–Z, Z–A, most and fewest resources | UI/client state; no direct API named | P2 |
| C6-PC-037 | ux-public-core | `/categories` cards and states | Open category cards; retry error; render empty | UI/client state; no direct API named | P2 |
| C6-PC-038 | ux-public-core | Taxonomy navigation | Use Browse back, breadcrumbs, child tiles, siblings and parent tile | UI/client state; no direct API named | P0 |
| C6-PC-039 | ux-public-core | Taxonomy tools | Toggle Filters & view and search within collection | /api/resources | P0 |
| C6-PC-040 | ux-public-core | Taxonomy scope | Select child/Uncategorized and toggle Uncategorized tile | UI/client state; no direct API named | P0 |
| C6-PC-041 | ux-public-core | Taxonomy kind/sort | Change resource kind and Default/A–Z/Z–A sort | UI/client state; no direct API named | P0 |
| C6-PC-042 | ux-public-core | Taxonomy facets | Toggle provider, format, skill and tags in sidebar/sheet; search tags; Clear all | UI/client state; no direct API named | P0 |
| C6-PC-043 | ux-public-core | Taxonomy views/cards | Switch Grid/List/Compact and use title, details, external, tag and personal actions | UI/client state; no direct API named | P0 |
| C6-PC-044 | ux-public-core | Taxonomy active filters | Remove scope/search/facet chips; Clear all; accept fuzzy suggestion; remove invalid/unknown filters | UI/client state; no direct API named | P0 |
| C6-PC-045 | ux-public-core | Taxonomy pagination | Use Previous/Next, numbered links and typed page jump incl. Enter/blur | /api/awesome-list/listing, /api/resources | P2 |
| C6-PC-046 | ux-public-core | Taxonomy states | Exercise loading, listing/facet errors, offline, invalid filters, 404 and empty/populated results | UI/client state; no direct API named | P2 |
| C6-PC-047 | ux-public-core | `/tag/:slug` navigation | Use Back to Home and Search all resources | UI/client state; no direct API named | P0 |
| C6-PC-048 | ux-public-core | Tag related topics | Open inline related links and All related topics fragment | UI/client state; no direct API named | P0 |
| C6-PC-049 | ux-public-core | Tag resource cards | Use title/details/external, favorite, bookmark, edit and tag actions | UI/client state; no direct API named | P0 |
| C6-PC-050 | ux-public-core | Tag pagination/states | Use page links and typed jump; trigger loading, error, offline, empty and out-of-range | /api/resources?tags=…&facets=true | P2 |
| C6-PC-051 | ux-public-core | `/resource/:id` Back | Activate Back with and without in-app history | UI/client state; no direct API named | P0 |
| C6-PC-052 | ux-public-core | Resource taxonomy/tags | Open category, subcategory, sub-subcategory and tag chips | UI/client state; no direct API named | P0 |
| C6-PC-053 | ux-public-core | Resource external links | Use primary visit and Canonical URL | /api/interactions | P0 |
| C6-PC-054 | ux-public-core | Resource Favorite | Add/remove favorite and trigger failure/auth states | /api/favorites/:id | P2 |
| C6-PC-055 | ux-public-core | Resource Bookmark | Save/remove; edit notes; select collections; Undo | /api/bookmarks/:id | P0 |
| C6-PC-056 | ux-public-core | Resource Share | Share through native sheet, cancellation and clipboard fallback | UI/client state; no direct API named | P2 |
| C6-PC-057 | ux-public-core | Resource Suggest Edit | Open auth wall, then edit title/URL/description/taxonomy and submit | /api/resources/:id/edits | P0 |
| C6-PC-058 | ux-public-core | Resource Report broken link | Open report, add optional note, cancel and submit | /api/resources/:id/link-report | P2 |
| C6-PC-059 | ux-public-core | Resource discovery links | Open related resources, More like this, collection, tag and search links | /api/resources/:id/related | P2 |
| C6-PC-060 | ux-public-core | Resource metadata/admin | Inspect image failure, classifications, dates and admin Edit in Admin | UI/client state; no direct API named | P2 |
| C6-PC-061 | ux-public-core | Resource states | Exercise loading, error/Retry, offline/reconnect and malformed/missing IDs | UI/client state; no direct API named | P2 |
| C6-PC-062 | ux-public-core | Route/chunk errors | Force chunk failure, offline retry, auto-reload failure and route crash | UI/client state; no direct API named | P2 |
| C6-PC-063 | ux-public-core | 404 surface | Open suggestion, Browse categories and Go home | UI/client state; no direct API named | P0 |
| C6-PC-064 | ux-public-core | Legacy/alias routes | Follow login/register/signup/auth, explore, bare resource/category/tag/journey, favorites/account, subsubcategory, iostvos and nested category aliases | UI/client state; no direct API named | P2 |
| C6-PC-065 | ux-public-core | `/collection/:shareId` | Load shared collection, open read-only cards, retry error/offline and render empty/404 | /api/public/collections/:shareId | P2 |
| C6-PC-066 | ux-public-core | Guest `/bookmarks` | Start empty, save resources, retry failed/offline loads and upgrade to account | /api/resources/:id | P2 |
| C6-PS-001 | ux-public-secondary | `/search` initial state | Load with no query or sub-2-char query | UI/client state; no direct API named | P2 |
| C6-PS-002 | ux-public-secondary | Search input | Type, pause, press Escape, press pristine `/` | UI/client state; no direct API named | P1 |
| C6-PS-003 | ux-public-secondary | Search sort | Change each relevance/date/title sort option | UI/client state; no direct API named | P1 |
| C6-PS-004 | ux-public-secondary | Search taxonomy facets | Select category, subcategory and sub-subcategory | UI/client state; no direct API named | P1 |
| C6-PS-005 | ux-public-secondary | Search other facets/sheet | Toggle provider, format, skill and tags; search tags; open/close mobile Filters | UI/client state; no direct API named | P1 |
| C6-PS-006 | ux-public-secondary | Active filters | Remove individual chips and Clear all incl. unsupported sort | UI/client state; no direct API named | P1 |
| C6-PS-007 | ux-public-secondary | Search result cards | Open title, View Details, Open Link, favorite/bookmark/edit and tag pills | UI/client state; no direct API named | P1 |
| C6-PS-008 | ux-public-secondary | Search pagination | Use Previous/Next, numbers and typed jump | UI/client state; no direct API named | P2 |
| C6-PS-009 | ux-public-secondary | Empty results recovery | Use Clear filters/search, Browse categories, Advanced and popular category links | UI/client state; no direct API named | P2 |
| C6-PS-010 | ux-public-secondary | Fuzzy suggestion | Accept Did you mean suggestion | UI/client state; no direct API named | P1 |
| C6-PS-011 | ux-public-secondary | Search states | Exercise loading, offline Retry/reconnect, server error, invalid filters and over-limit query | UI/client state; no direct API named | P2 |
| C6-PS-012 | ux-public-secondary | `/advanced` tabs | Switch Explorer, Metrics, Export and AI Recommendations; navigate Back/Forward | UI/client state; no direct API named | P1 |
| C6-PS-013 | ux-public-secondary | Explorer controls | Search, sort by name/count/activity, toggle Show subcategories | UI/client state; no direct API named | P1 |
| C6-PS-014 | ux-public-secondary | Explorer tags | Toggle tags, Show all/fewer and Clear all | UI/client state; no direct API named | P1 |
| C6-PS-015 | ux-public-secondary | Explorer cards | Collapse/expand category, open category and external preview links | UI/client state; no direct API named | P1 |
| C6-PS-016 | ux-public-secondary | Metrics | Switch Overview/Categories and inspect values | UI/client state; no direct API named | P1 |
| C6-PS-017 | ux-public-secondary | Export format selection | Choose six showcase format cards and matching select | UI/client state; no direct API named | P1 |
| C6-PS-018 | ux-public-secondary | Export content options | Toggle descriptions, tags, categories and grouping | UI/client state; no direct API named | P1 |
| C6-PS-019 | ux-public-secondary | Export categories | Select All, Clear All and toggle individual categories | UI/client state; no direct API named | P1 |
| C6-PS-020 | ux-public-secondary | Export downloads | Download each format and repeat/double-click | UI/client state; no direct API named | P2 |
| C6-PS-021 | ux-public-secondary | Advanced states | Exercise loading, catalog error/Retry, offline and empty corpus | UI/client state; no direct API named | P2 |
| C6-PS-022 | ux-public-secondary | Advanced CTA | Use Browse All Resources and Explore Categories | UI/client state; no direct API named | P2 |
| C6-PS-023 | ux-public-secondary | `/journeys` filter | Filter category and Clear filter on empty | UI/client state; no direct API named | P2 |
| C6-PS-024 | ux-public-secondary | Journey cards | Open title and Start/Continue/Completed Review | /api/journeys/:id/start | P1 |
| C6-PS-025 | ux-public-secondary | Journey detail access | Use Back to Journeys and guest login link | UI/client state; no direct API named | P1 |
| C6-PS-026 | ux-public-secondary | Journey detail enrollment | Start from detail page | /api/journeys/:id/start | P2 |
| C6-PS-027 | ux-public-secondary | Journey resources | Open internal resource and external source | UI/client state; no direct API named | P1 |
| C6-PS-028 | ux-public-secondary | Journey progress | Mark complete, undo, complete all, and toggle offline/rapidly | /api/journeys/:id/progress | P2 |
| C6-PS-029 | ux-public-secondary | Journey states | Exercise loading, error/Retry, offline, missing journey and zero-step content | UI/client state; no direct API named | P2 |
| C6-PS-030 | ux-public-secondary | `/continue-learning` guest | Use Sign in and Browse journeys as guest | UI/client state; no direct API named | P1 |
| C6-PS-031 | ux-public-secondary | Continue active journeys | Resume next step; handle unavailable journey | /api/journeys/:id/start | P1 |
| C6-PS-032 | ux-public-secondary | Continue other sections | Open recent resource, completed review and suggested journey | /api/user/continue-learning | P1 |
| C6-PS-033 | ux-public-secondary | Continue states | Render no history, loading, error/Retry and offline | UI/client state; no direct API named | P2 |
| C6-PS-034 | ux-public-secondary | Guest `/recommendations` | Open popular resource cards and sign-in CTA | /api/recommendations?limit=12 | P2 |
| C6-PS-035 | ux-public-secondary | Recommendation preferences | Edit learning preferences and Refresh | UI/client state; no direct API named | P1 |
| C6-PS-036 | ux-public-secondary | Recommendation cards | Expand Why this and View resource | UI/client state; no direct API named | P1 |
| C6-PS-037 | ux-public-secondary | Recommendation feedback | Toggle Helpful, Not for me, Already know and Hide; Undo/Restore | /api/recommendations/:id/feedback, /api/recommendations/feedback | P1 |
| C6-PS-038 | ux-public-secondary | Recommendation states | Trigger initial loading, error, offline pause, stale cache, empty and feedback-sync failure | UI/client state; no direct API named | P2 |
| C6-PS-039 | ux-public-secondary | `/about` maintainer/contact | Open maintainer GitHub, deletion path and configured contact | /api/config | P1 |
| C6-PS-040 | ux-public-secondary | About sources/credits | Open awesome-video, awesome-list-site, shadcn/ui and Tailwind links | UI/client state; no direct API named | P1 |
| C6-PS-041 | ux-public-secondary | About FAQ | Toggle each FAQ and revisit with keyboard | UI/client state; no direct API named | P1 |
| C6-PS-042 | ux-public-secondary | `/terms`, `/privacy`, `/code-of-conduct` | Follow legal body links and Open cookie settings | UI/client state; no direct API named | P1 |
| C6-PS-043 | ux-public-secondary | `/settings/theme` | Select each design system, accent and font; retry account save | /api/user/preferences | P2 |
| C6-PS-044 | ux-public-secondary | `/design-system` | Switch systems/accents and return to Theme Settings | UI/client state; no direct API named | P1 |
| C6-PS-045 | ux-public-secondary | `/settings` signed out | Use Back, Appearance and sign-in prompt; change Home layout | UI/client state; no direct API named | P1 |
| C6-PS-046 | ux-public-secondary | `/sign-in` and auth aliases | Complete Clerk sign-in and follow legacy login/forgot/reset/auth routes | UI/client state; no direct API named | P1 |
| C6-PS-047 | ux-public-secondary | `/sign-up` | Complete Clerk sign-up | UI/client state; no direct API named | P1 |
| C6-PS-048 | ux-public-secondary | `/sign-in?admin` | Submit empty, wrong, valid and rate-limited admin password | /api/auth/admin-login | P2 |
| C6-PS-049 | ux-public-secondary | Auth unavailable/stale session | Load Clerk offline/timeout, Retry while offline, reconnect | UI/client state; no direct API named | P2 |
| C6-PS-050 | ux-public-secondary | `/logout` and sign-out failure | Load logout and force verification failure | UI/client state; no direct API named | P2 |
| C6-PS-051 | ux-public-secondary | Protected-page guards | Hard-load profile/contributions/notifications/onboarding/admin as guest and non-admin | UI/client state; no direct API named | P2 |
| C6-PS-052 | ux-public-secondary | Public machine/document surfaces | Fetch `/robots.txt`, `/llms.txt`, `/sitemap.xml`, OG images, security.txt and manifest | UI/client state; no direct API named | P1 |
| C6-PS-053 | ux-public-secondary | Developer docs | Open `/api/docs` and `/api/openapi.json` | UI/client state; no direct API named | P1 |
| C6-PS-054 | ux-public-secondary | Optional contact variants | Open contact from palette/footer, validate fields, cancel and submit; use email/issues/discussions | /api/config, /api/contact | P2 |
| C6-PS-055 | ux-public-secondary | Public read API | Call `/api/public/resources`, `/api/public/resources/:id`, `/api/public/categories`, `/api/public/tags`, `/api/public/me` | UI/client state; no direct API named | P1 |
| C6-PS-056 | ux-public-secondary | General health/version | Read `/api/version`, `/api/health`, `/api/health/live`, `/api/health/ready`, `/api/health/ai` | UI/client state; no direct API named | P1 |
| C6-PS-057 | ux-public-secondary | **C5-UNVERIFIED: Reduced motion** | Re-drive all secondary pages with reduced motion | UI/client state; no direct API named | P2 |
| C6-PS-058 | ux-public-secondary | **C5-UNVERIFIED: Full keyboard walk** | Tab and activate through every secondary page and dialog | UI/client state; no direct API named | P1 |
| C6-PS-059 | ux-public-secondary | **C5-UNVERIFIED: Target sweeps at 820 and 1440 for every page** | Measure every visible interactive element on secondary pages | UI/client state; no direct API named | P1 |
| C6-PS-060 | ux-public-secondary | **C5-UNVERIFIED: `/advanced` Metrics and Export downloads** | Open Metrics then execute all export downloads | UI/client state; no direct API named | P1 |
| C6-PS-061 | ux-public-secondary | **C5-UNVERIFIED: PS-14 re-measure** | Re-measure Clerk Use phone on `/sign-in` | UI/client state; no direct API named | P1 |
| C6-PS-062 | ux-public-secondary | **C5-UNVERIFIED: Sitemap and robots sample** | Compare sitemap URLs and robots rules with live pages | UI/client state; no direct API named | P1 |
| C6-PS-063 | ux-public-secondary | **C5-UNVERIFIED: Footer `PRs welcome` link (73×24, inline)** | Measure and rule on the inline link | UI/client state; no direct API named | P1 |
| C6-AX-001 | ux-a11y | Global semantics | Use skip link and inspect landmarks/headings | UI/client state; no direct API named | P2 |
| C6-AX-002 | ux-a11y | First load, no fragment | Load each page without hash | UI/client state; no direct API named | P1 |
| C6-AX-003 | ux-a11y | Fragment navigation | Open direct fragment and keyboard-activate same-page fragment | UI/client state; no direct API named | P1 |
| C6-AX-004 | ux-a11y | Browser history | Follow fragment → another page → Back, then Forward | UI/client state; no direct API named | P1 |
| C6-AX-005 | ux-a11y | Drawer/rail keyboard | Open drawer, traverse controls, close backdrop/Escape; collapse/expand rail | UI/client state; no direct API named | P1 |
| C6-AX-006 | ux-a11y | Dialogs and filter sheet | Open, toggle values, use Escape/Done and destructive cancel dialogs | UI/client state; no direct API named | P1 |
| C6-AX-007 | ux-a11y | Resource cards | Perform full Tab-key walk of grid/list/compact cards | UI/client state; no direct API named | P1 |
| C6-AX-008 | ux-a11y | Theme and preference radios | Use arrows/Home/End on system, accent, font, home layout and learning preferences | UI/client state; no direct API named | P1 |
| C6-AX-009 | ux-a11y | Settings keyboard walks | Walk full settings and notification preferences at desktop and touch widths | UI/client state; no direct API named | P1 |
| C6-AX-010 | ux-a11y | Target sizes | Measure visible controls across public, member and admin surfaces | UI/client state; no direct API named | P1 |
| C6-AX-011 | ux-a11y | Contrast | Render all accents and both design systems on core page types | UI/client state; no direct API named | P2 |
| C6-AX-012 | ux-a11y | Reduced motion | Enable reduced motion and use cards, tabs, pagination, smooth anchors and disclosures | UI/client state; no direct API named | P2 |
| C6-AX-013 | ux-a11y | Offline/reconnect | Go offline on each page type, Retry while offline, then reconnect | UI/client state; no direct API named | P2 |
| C6-AX-014 | ux-a11y | Error auto-recovery | Measure app ErrorPage automatic network recovery timing | UI/client state; no direct API named | P2 |
| C6-AX-015 | ux-a11y | Loading/empty semantics | Compare skeleton, loading, empty and unavailable regions with screen reader | UI/client state; no direct API named | P2 |
| C6-AX-016 | ux-a11y | Live feedback | Trigger favorite, bookmark, recommendation, validation and save toasts | UI/client state; no direct API named | P2 |
| C6-AX-017 | ux-a11y | Screen-reader speech | Drive representative pages with an actual screen reader | UI/client state; no direct API named | P2 |
| C6-AX-018 | ux-a11y | Real input modality | Repeat critical touch flows on real coarse pointer rather than emulation | UI/client state; no direct API named | P2 |
| C6-AX-019 | ux-a11y | Accessible names/states | Inspect repeated cards, tabs, progress bars, switches, tables and disclosure controls | UI/client state; no direct API named | P1 |
| C6-MB-001 | ux-member | Sign-in/guest merge | Sign in with on-device saves, duplicates, missing and failing resources | UI/client state; no direct API named | P2 |
| C6-MB-002 | ux-member | `/profile` tabs | Switch Overview, Favorites, Bookmarks, Submissions, Security and Back/Forward | UI/client state; no direct API named | P0 |
| C6-MB-003 | ux-member | Profile display name | Open editor, submit empty/invisible/valid names, cancel and save | /api/user/profile | P2 |
| C6-MB-004 | ux-member | Profile session controls | Open Settings, Sign out and Sign out all devices with confirm/cancel | UI/client state; no direct API named | P2 |
| C6-MB-005 | ux-member | Profile overview | Inspect progress, streak, current path and estimated time | /api/user/progress, /api/user/journeys | P2 |
| C6-MB-006 | ux-member | Continue preview | Open dashboard, Resume, open recent or Explore journeys | /api/user/continue-learning | P2 |
| C6-MB-007 | ux-member | Profile recommendations | Refresh, open cards and feedback, open hidden restore | UI/client state; no direct API named | P0 |
| C6-MB-008 | ux-member | Favorites tab | Add/remove favorite, open title/external and recover empty/error | /api/favorites/:id | P2 |
| C6-MB-009 | ux-member | Profile bookmarks tab | Remove/edit notes, open title/external and recover empty/error | UI/client state; no direct API named | P2 |
| C6-MB-010 | ux-member | Submissions summary | Open contribution dashboard | /api/user/contributions?limit=1 | P2 |
| C6-MB-011 | ux-member | Account security | Open Manage account security | UI/client state; no direct API named | P0 |
| C6-MB-012 | ux-member | API keys create/reveal | Name key, choose expiry, create, copy and dismiss secret | /api/user/api-keys | P2 |
| C6-MB-013 | ux-member | API keys list/revoke | Inspect empty/populated/expired keys, cancel/confirm revoke and handle error | /api/user/api-keys, /api/user/api-keys/:id | P2 |
| C6-MB-014 | ux-member | Account deletion | Open/cancel/confirm deletion request and handle failure | /api/user/deletion-request | P2 |
| C6-MB-015 | ux-member | Deletion withdrawal | Withdraw pending request | /api/user/deletion-request | P2 |
| C6-MB-016 | ux-member | `/bookmarks` summary | Use Active, Saved, Watch next, In progress, Done and Archived cards | /api/bookmarks | P0 |
| C6-MB-017 | ux-member | Collection filtering | Use All saved, individual collection and mobile Collection select | UI/client state; no direct API named | P0 |
| C6-MB-018 | ux-member | Collection create/rename | Create, rename, submit blank and cancel | /api/collections, /api/collections/:id | P0 |
| C6-MB-019 | ux-member | Collection reorder | Move collections up/down including edges | /api/collections/reorder | P0 |
| C6-MB-020 | ux-member | Collection archive/restore | Archive and restore selected collection | /api/collections/:id | P0 |
| C6-MB-021 | ux-member | Collection sharing | Publish link, copy link and unpublish | /api/collections/:id/publish | P0 |
| C6-MB-022 | ux-member | Collection deletion | Open/cancel/confirm delete | /api/collections/:id | P0 |
| C6-MB-023 | ux-member | Library filters | Change Queue status, Visibility and Sort | UI/client state; no direct API named | P0 |
| C6-MB-024 | ux-member | Bookmark selection | Select all shown and individual cards; clear selection | UI/client state; no direct API named | P0 |
| C6-MB-025 | ux-member | Bulk queue status | Choose status and Apply | /api/bookmarks/bulk | P2 |
| C6-MB-026 | ux-member | Bulk Move to collection | Choose destination and Move | UI/client state; no direct API named | P0 |
| C6-MB-027 | ux-member | Bulk personal tags | Add and Remove same tag | UI/client state; no direct API named | P2 |
| C6-MB-028 | ux-member | Bulk archive/restore | Archive active selections and restore archived selections | UI/client state; no direct API named | P0 |
| C6-MB-029 | ux-member | Bookmark notes | Open Note, edit ≤500 chars, save and cancel | /api/bookmarks/:id | P0 |
| C6-MB-030 | ux-member | Bookmark card actions | Change queue status, archive/restore, and use resource title/details/external/favorite/bookmark | UI/client state; no direct API named | P0 |
| C6-MB-031 | ux-member | Library states | Exercise loading, error/Retry, offline, empty library, empty collection and no matches | UI/client state; no direct API named | P2 |
| C6-MB-032 | ux-member | Guest-to-member library | Reach cap, go offline, then sign in and inspect merged library | UI/client state; no direct API named | P2 |
| C6-MB-033 | ux-member | Journey listing enrollment | Start fresh journey from listing | /api/journeys/:id/start | P0 |
| C6-MB-034 | ux-member | Journey detail enrollment | Start fresh journey from detail | UI/client state; no direct API named | P2 |
| C6-MB-035 | ux-member | Journey completion state | Complete all steps and undo every step | UI/client state; no direct API named | P0 |
| C6-MB-036 | ux-member | Continue-learning flows | Resume, open recent and suggested content | UI/client state; no direct API named | P0 |
| C6-MB-037 | ux-member | Helpful feedback | Select/deselect Helpful and trigger save failure | UI/client state; no direct API named | P2 |
| C6-MB-038 | ux-member | Not for me / Already know | Apply both states, reload and inspect recovery | UI/client state; no direct API named | P0 |
| C6-MB-039 | ux-member | Hide feedback | Hide, Undo immediately and Restore later | UI/client state; no direct API named | P0 |
| C6-MB-040 | ux-member | Recommendation preferences | Edit preferences and refresh results | UI/client state; no direct API named | P0 |
| C6-MB-041 | ux-member | `/contributions` filters | Search, filter type/status, and sort | /api/user/contributions | P0 |
| C6-MB-042 | ux-member | Contribution cards | Expand edit changes, open submitted URL/public resource, inspect rejected/superseded states | UI/client state; no direct API named | P0 |
| C6-MB-043 | ux-member | Contribution withdrawal | Open/cancel/confirm withdraw and handle 409 | /api/user/contributions/:kind/:id/withdraw | P0 |
| C6-MB-044 | ux-member | Contribution states | Use pagination and render loading, error, offline, no contributions and no matches | UI/client state; no direct API named | P2 |
| C6-MB-045 | ux-member | `/submit` form fields | Edit title, URL, description, category, subcategory, sub-subcategory and tags | UI/client state; no direct API named | P2 |
| C6-MB-046 | ux-member | Submit URL checks | Enter duplicate, reserved, malformed and server-rejected URLs | /api/resources/check-url | P2 |
| C6-MB-047 | ux-member | Submit draft/cancel | Restore draft, edit across tabs, Cancel and confirm/keep editing | UI/client state; no direct API named | P0 |
| C6-MB-048 | ux-member | Submit success | Submit valid resource and open contributions | /api/resources | P0 |
| C6-MB-049 | ux-member | Submit auth states | Load while auth pending/failing/signed out and retry auth | UI/client state; no direct API named | P2 |
| C6-MB-050 | ux-member | Populated notification inbox | Open each notification kind and Mark read | /api/notifications?limit=50 | P0 |
| C6-MB-051 | ux-member | Inbox bulk/states | Mark all read and exercise empty, loading, error/offline and mutation failure | /api/notifications/read-all | P2 |
| C6-MB-052 | ux-member | Notification preferences | Toggle Email digest/In-app and three sections; change cadence/timezone | /api/notification-preferences | P2 |
| C6-MB-053 | ux-member | Pause/resume notifications | Pause for 7 days and Resume now | UI/client state; no direct API named | P0 |
| C6-MB-054 | ux-member | Unsubscribe all | Disable both channels in one quick action | /api/notification-preferences | P0 |
| C6-MB-055 | ux-member | Save choices | Save valid changes and trigger server failure | UI/client state; no direct API named | P2 |
| C6-MB-056 | ux-member | Digest preview | Open preview links and render loading/error/empty | /api/digests/preview | P2 |
| C6-MB-057 | ux-member | Digest unsubscribe link | GET token page then POST confirmation; revisit used/invalid link | UI/client state; no direct API named | P0 |
| C6-MB-058 | ux-member | `/settings` hub | Open Appearance, Account, Security, Bookmarks and Recommendations | UI/client state; no direct API named | P0 |
| C6-MB-059 | ux-member | Home layout preference | Select Index/Curated as member and guest | UI/client state; no direct API named | P2 |
| C6-MB-060 | ux-member | Learning preferences fields | Change skill, topics, goals, formats and time | UI/client state; no direct API named | P0 |
| C6-MB-061 | ux-member | Save learning preferences | Save complete profile | /api/user/preferences | P2 |
| C6-MB-062 | ux-member | Reset learning preferences | Cancel/confirm reset and handle failure | /api/user/preferences | P2 |
| C6-MB-063 | ux-member | Learning states | Render loading, load error, no saved preferences and editor | UI/client state; no direct API named | P2 |
| C6-MB-064 | ux-member | Theme account writes | Change system and accent as member, force conflict/offline and retry | UI/client state; no direct API named | P2 |
| C6-MB-065 | ux-member | Font override | Choose every font and system default, reload and switch tabs | UI/client state; no direct API named | P0 |
| C6-MB-066 | ux-member | Onboarding step 1 | Choose Beginner, Intermediate or Advanced and Continue | UI/client state; no direct API named | P0 |
| C6-MB-067 | ux-member | Onboarding step 2 | Toggle topics, attempt zero and choose valid topics | UI/client state; no direct API named | P2 |
| C6-MB-068 | ux-member | Onboarding step 3 | Toggle goals, attempt zero and choose valid goals | UI/client state; no direct API named | P2 |
| C6-MB-069 | ux-member | Onboarding step 4 | Toggle formats, attempt zero and choose valid formats | UI/client state; no direct API named | P2 |
| C6-MB-070 | ux-member | Onboarding step 5 | Select time commitment and Save preferences | /api/user/preferences | P2 |
| C6-MB-071 | ux-member | Onboarding navigation/draft | Continue, Back, browser Back/Forward and reload mid-flow | UI/client state; no direct API named | P0 |
| C6-MB-072 | ux-member | Onboarding skip/completion | Save and browse later, revisit completed onboarding and complete again | UI/client state; no direct API named | P2 |
| C6-MB-073 | ux-member | Onboarding states | Trigger preference/category load failure and save failure | UI/client state; no direct API named | P2 |
| C6-MB-074 | ux-member | Public API key consumption | Use created key against public API and docs | /api/public/me | P0 |
| C6-MB-075 | ux-member | **C5-UNVERIFIED: Offline handling** | Take member queries and each mutation offline, then reconnect | UI/client state; no direct API named | P2 |
| C6-MB-076 | ux-member | **C5-UNVERIFIED: Reduced motion** | Use all member surfaces with reduced motion | UI/client state; no direct API named | P2 |
| C6-MB-077 | ux-member | **C5-UNVERIFIED: Touch was checked by emulation only** | Repeat member controls on real touch input | UI/client state; no direct API named | P2 |
| C6-MB-078 | ux-member | **C5-UNVERIFIED: Keyboard walk at 820/390** | Walk every settings and member page at touch widths | UI/client state; no direct API named | P0 |
| C6-MB-079 | ux-member | **C5-UNVERIFIED: Clerk member session out of reach** | Exercise actual non-owner Clerk member auth and return | UI/client state; no direct API named | P0 |
| C6-MB-080 | ux-member | **C5-UNVERIFIED: #82 tag-card actions not re-driven** | Re-drive every action on `/tag/hls` cards at touch widths | UI/client state; no direct API named | P0 |
| C6-MB-081 | ux-member | Member API aliases/compatibility | Exercise canonical and legacy contribution/bookmark/recommendation routes used by older surfaces | /api/submit, /api/user/submissions/:id, /api/user/submissions, /api/recommendations/feedback, /api/interactions | P0 |
| SH-01 | ux-a11y | Global desktop header | Activate `Admin` | /api/auth/user | P1 |
| SH-02 | ux-a11y | Global sidebar | Activate `Admin` | /api/auth/user | P1 |
| SH-03 | ux-a11y | Account menu | Open menu, then activate `Admin` | UI/client state; no direct API named | P1 |
| SH-04 | ux-a11y | Account menu / owner session | Activate `Sign out` | /api/auth/admin-logout, /api/auth/user | P1 |
| SH-05 | ux-a11y | `/sign-in?admin` | Submit correct owner password | /api/auth/admin-login | P1 |
| SH-06 | ux-a11y | `/sign-in?admin` | Submit incorrect password | UI/client state; no direct API named | P1 |
| SH-07 | ux-a11y | `/sign-in?admin` | Submit after rate limit is reached | UI/client state; no direct API named | P1 |
| SH-08 | ux-a11y | `/sign-in?admin` | Submit while offline | UI/client state; no direct API named | P2 |
| SH-09 | ux-a11y | `/admin` guard | Load while `GET /api/auth/user` is pending | UI/client state; no direct API named | P2 |
| SH-10 | ux-a11y | `/admin` signed out | Activate `Sign in to continue →` | UI/client state; no direct API named | P1 |
| SH-11 | ux-a11y | `/admin` signed-in non-admin | Activate `Back to home →` | UI/client state; no direct API named | P1 |
| SH-12 | ux-a11y | `/admin` expired session | Activate `Sign in to continue →` after a protected 401 | UI/client state; no direct API named | P1 |
| SH-13 | ux-a11y | `/admin` initial stats | Open with `GET /api/admin/stats` pending | UI/client state; no direct API named | P2 |
| SH-14 | ux-a11y | `/admin` initial stats failure | Activate dashboard `Retry` | /api/admin/stats | P2 |
| SH-15 | ux-a11y | `/admin/<unknown>` | Open an unknown admin section | UI/client state; no direct API named | P2 |
| SH-16 | ux-a11y | `/admin/:section`, hash, aliases | Open every canonical section and aliases `link-health`, `sub-subcategories`, `sub-subcats`, `github-sync` | UI/client state; no direct API named | P2 |
| SH-17 | ux-a11y | `/admin#<tab>` and `?tab=` | Change hash/query, then use Back/Forward | UI/client state; no direct API named | P1 |
| SH-18 | ux-a11y | Admin tab strip overflow | Activate `Scroll tabs left` | UI/client state; no direct API named | P1 |
| SH-19 | ux-a11y | Admin tab strip overflow | Activate `Scroll tabs right` | UI/client state; no direct API named | P1 |
| SH-20 | ux-a11y | Admin tab strip | Use arrow keys, Enter, and Space | UI/client state; no direct API named | P1 |
| SH-21 | ux-a11y | Strip `Overview` | Activate tab | UI/client state; no direct API named | P1 |
| SH-22 | ux-a11y | Strip `Approvals` | Activate tab | UI/client state; no direct API named | P1 |
| SH-23 | ux-a11y | Strip `Edits` | Activate tab | UI/client state; no direct API named | P1 |
| SH-24 | ux-a11y | Strip `Enrichment` | Activate tab | UI/client state; no direct API named | P1 |
| SH-25 | ux-a11y | Strip `Researcher` | Activate tab | UI/client state; no direct API named | P1 |
| SH-26 | ux-a11y | Strip `Export` | Activate tab | UI/client state; no direct API named | P1 |
| SH-27 | ux-a11y | Strip `Database` | Activate tab | UI/client state; no direct API named | P1 |
| SH-28 | ux-a11y | Strip `Resources` | Activate tab | UI/client state; no direct API named | P1 |
| SH-29 | ux-a11y | Strip `Categories` | Activate tab | UI/client state; no direct API named | P1 |
| SH-30 | ux-a11y | Strip `Subcategories` | Activate tab, including return from Sub-Subcats | UI/client state; no direct API named | P1 |
| SH-31 | ux-a11y | Strip `Users` | Activate tab | UI/client state; no direct API named | P1 |
| SH-32 | ux-a11y | Strip `GitHub` | Activate tab | UI/client state; no direct API named | P1 |
| SH-33 | ux-a11y | Strip `Link Health` | Activate tab | UI/client state; no direct API named | P1 |
| SH-34 | ux-a11y | Strip `Audit` | Activate tab | UI/client state; no direct API named | P1 |
| SH-35 | ux-a11y | Strip `Research` | Activate tab | UI/client state; no direct API named | P1 |
| SH-36 | ux-a11y | Masthead `Settings` | Open/close the Settings menu | UI/client state; no direct API named | P1 |
| SH-37 | ux-a11y | Settings menu | Activate `Theme settings` | UI/client state; no direct API named | P1 |
| SH-38 | ux-a11y | Settings menu, pending count > 0 | Activate `Pending approvals` | UI/client state; no direct API named | P1 |
| SH-39 | ux-a11y | Settings menu, rejected count > 0 | Activate `Rejected resources` | UI/client state; no direct API named | P1 |
| SH-40 | ux-a11y | Settings menu | Activate `Sub-Subcats` | UI/client state; no direct API named | P1 |
| SH-41 | ux-a11y | Settings menu | Activate `Journeys` | UI/client state; no direct API named | P1 |
| SH-42 | ux-a11y | Settings menu | Activate `Digests` | UI/client state; no direct API named | P1 |
| SH-43 | ux-a11y | Masthead `New entry` | Activate twice, including while Resources is already open | UI/client state; no direct API named | P1 |
| SH-44 | ux-a11y | Entire admin shell | Sweep auth, tab, menu, focus, scroll, and motion states at real coarse pointer | UI/client state; no direct API named | P2 |
| OV-01 | ux-admin-content | `/admin#overview` Resources card | Activate card or its keyboard equivalent | /api/admin/stats, /api/categories | P0 |
| OV-02 | ux-admin-content | Overview Subcategories card | Activate card | /api/subcategories | P0 |
| OV-03 | ux-admin-content | Overview Active users card | Activate card | /api/admin/users | P0 |
| OV-04 | ux-admin-content | Overview Pending approvals card | Activate card | /api/admin/stats, /api/admin/pending-resources | P0 |
| OV-05 | ux-admin-content | Overview metric strip | Trigger partial source failure, then `Retry` | UI/client state; no direct API named | P2 |
| OV-06 | ux-admin-content | Overview Recent activity | Load activity | /api/admin/audit-logs?limit=6&offset=0 | P2 |
| OV-07 | ux-admin-content | Overview Recent activity | Activate `Retry` after failure | UI/client state; no direct API named | P2 |
| OV-08 | ux-admin-content | Overview Recent activity | Load with no audit rows | UI/client state; no direct API named | P2 |
| OV-09 | ux-admin-content | Overview Recent activity | Inspect populated six-row feed | UI/client state; no direct API named | P0 |
| OV-10 | ux-admin-content | Overview System health | Inspect all populated health rows | /api/health/ai | P0 |
| OV-11 | ux-admin-content | Overview System health | Trigger one and all health-source failures, then `Retry` | UI/client state; no direct API named | P2 |
| OV-12 | ux-admin-content | Overview Top categories | Load categories | /api/categories | P2 |
| OV-13 | ux-admin-content | Overview Top categories | Activate `Retry` after failure | /api/categories | P2 |
| OV-14 | ux-admin-content | Overview Top categories | Load with no approved-resource categories | UI/client state; no direct API named | P2 |
| OV-15 | ux-admin-content | Overview Top categories | Inspect top-five populated ranking | UI/client state; no direct API named | P0 |
| AP-01 | ux-admin-content | `/admin#approvals` | Load queue | /api/admin/pending-resources | P2 |
| AP-02 | ux-admin-content | Approvals queue | Activate `Retry` after a failed load | UI/client state; no direct API named | P2 |
| AP-03 | ux-admin-content | Approvals queue offline | Activate `Retry` | UI/client state; no direct API named | P2 |
| AP-04 | ux-admin-content | Approvals empty queue | Activate `Check again`, including offline | UI/client state; no direct API named | P2 |
| AP-05 | ux-admin-content | Approvals populated queue | Inspect table and poll update | /api/admin/pending-resources | P0 |
| AP-06 | ux-admin-content | Approvals table header | Toggle `Select all pending resources` | UI/client state; no direct API named | P0 |
| AP-07 | ux-admin-content | Approvals row | Toggle row checkbox | UI/client state; no direct API named | P0 |
| AP-08 | ux-admin-content | Approvals toolbar | Open `Bulk reject (N)` | UI/client state; no direct API named | P0 |
| AP-09 | ux-admin-content | Bulk-reject dialog | Enter short and valid rejection reasons | UI/client state; no direct API named | P0 |
| AP-10 | ux-admin-content | Bulk-reject dialog | Cancel via button, X, or Escape | /api/admin/resources/bulk/reject | P0 |
| AP-11 | ux-admin-content | Bulk-reject confirmation | Confirm selected rejection | /api/admin/resources/bulk/reject | P0 |
| AP-12 | ux-admin-content | Approvals toolbar | Open `Approve selected (N)` or `Approve all` | UI/client state; no direct API named | P0 |
| AP-13 | ux-admin-content | Bulk-approve dialog | Cancel | /api/admin/resources/bulk/approve | P0 |
| AP-14 | ux-admin-content | Bulk-approve confirmation | Confirm approval | /api/admin/resources/bulk/approve | P0 |
| AP-15 | ux-admin-content | Approvals bulk outcome | Inspect success and partial-failure result banner | UI/client state; no direct API named | P2 |
| AP-16 | ux-admin-content | Approvals row title | Open external URL icon | UI/client state; no direct API named | P0 |
| AP-17 | ux-admin-content | Approvals row | Open `Review` | UI/client state; no direct API named | P0 |
| AP-18 | ux-admin-content | Resource Details | Activate valid URL | UI/client state; no direct API named | P0 |
| AP-19 | ux-admin-content | Resource Details | Inspect malformed URL and missing description states | UI/client state; no direct API named | P0 |
| AP-20 | ux-admin-content | Resource Details | Activate `Close`, X, or Escape | UI/client state; no direct API named | P0 |
| AP-21 | ux-admin-content | Approvals row | Open `Approve`, then cancel | UI/client state; no direct API named | P0 |
| AP-22 | ux-admin-content | Approvals row approve confirmation | Confirm approval | /api/admin/resources/:id/approve | P0 |
| AP-23 | ux-admin-content | Approvals row | Open `Reject`, edit reason, then cancel | UI/client state; no direct API named | P2 |
| AP-24 | ux-admin-content | Approvals row reject confirmation | Confirm rejection | /api/admin/resources/:id/reject | P0 |
| AP-25 | ux-admin-content | Approvals table | Swipe and keyboard-scroll horizontally at narrow widths | UI/client state; no direct API named | P0 |
| ED-01 | ux-admin-content | `/admin#edits` | Load edit queue | /api/admin/resource-edits | P2 |
| ED-02 | ux-admin-content | Edit queue | Activate `Retry` after failure | UI/client state; no direct API named | P2 |
| ED-03 | ux-admin-content | Edit queue offline | Activate `Retry` | UI/client state; no direct API named | P2 |
| ED-04 | ux-admin-content | Edit queue empty | Activate `Check again`, including offline | UI/client state; no direct API named | P2 |
| ED-05 | ux-admin-content | Edit queue populated | Inspect pending rows and polling | /api/admin/resource-edits | P0 |
| ED-06 | ux-admin-content | Edit row resource title | Activate internal resource link | UI/client state; no direct API named | P0 |
| ED-07 | ux-admin-content | Edit row external-link icon | Activate external resource URL | UI/client state; no direct API named | P0 |
| ED-08 | ux-admin-content | Edit row | Open `Diff` | UI/client state; no direct API named | P0 |
| ED-09 | ux-admin-content | Edit Details conflict state | Inspect conflict detected after resource changed | UI/client state; no direct API named | P0 |
| ED-10 | ux-admin-content | Edit Details | Activate resource URL | UI/client state; no direct API named | P0 |
| ED-11 | ux-admin-content | Edit Details | Activate `Close`, X, or Escape | UI/client state; no direct API named | P0 |
| ED-12 | ux-admin-content | Edit row | Open ordinary `Approve` | UI/client state; no direct API named | P0 |
| ED-13 | ux-admin-content | Edit row conflict | Open `Approve` on conflicted suggestion | UI/client state; no direct API named | P0 |
| ED-14 | ux-admin-content | Approve Edit dialog | Cancel | /api/admin/resource-edits/:id/approve | P2 |
| ED-15 | ux-admin-content | Approve Edit confirmation | Confirm `Approve & Merge` | /api/admin/resource-edits/:id/approve | P0 |
| ED-16 | ux-admin-content | Approve Edit dialog | Inspect failed approval state | UI/client state; no direct API named | P2 |
| ED-17 | ux-admin-content | Edit row | Open `Reject` | UI/client state; no direct API named | P0 |
| ED-18 | ux-admin-content | Reject Edit dialog | Enter short and valid reasons | UI/client state; no direct API named | P0 |
| ED-19 | ux-admin-content | Reject Edit dialog | Cancel | /api/admin/resource-edits/:id/reject | P2 |
| ED-20 | ux-admin-content | Reject Edit confirmation | Confirm rejection | /api/admin/resource-edits/:id/reject | P0 |
| ED-21 | ux-admin-content | Reject Edit dialog | Inspect failed rejection state | UI/client state; no direct API named | P2 |
| ED-22 | ux-admin-content | Edit table | Swipe and keyboard-scroll horizontally | UI/client state; no direct API named | P0 |
| RM-01 | ux-admin-content | `/admin#resources` | Initial load | /api/admin/resources | P0 |
| RM-02 | ux-admin-content | Resources table | Activate `Retry` after load failure | UI/client state; no direct API named | P2 |
| RM-03 | ux-admin-content | Resources offline | Request another page, then use `Stay on page N` or `Retry` | UI/client state; no direct API named | P2 |
| RM-04 | ux-admin-content | Resources empty catalog | Load with zero total | UI/client state; no direct API named | P2 |
| RM-05 | ux-admin-content | Resources filtered-empty | Activate inline `Clear filters` | UI/client state; no direct API named | P2 |
| RM-06 | ux-admin-content | Resources populated table | Inspect rows, counts, tags, status, and horizontal overflow | /api/admin/resources | P0 |
| RM-07 | ux-admin-content | Resources header | Type in `Search…` | UI/client state; no direct API named | P0 |
| RM-08 | ux-admin-content | Resources header | Toggle `Show/Hide filters and tools` | UI/client state; no direct API named | P0 |
| RM-09 | ux-admin-content | Resource filters | Type in `Search by title or URL...` | UI/client state; no direct API named | P0 |
| RM-10 | ux-admin-content | Resource filters | Choose each category including `All Categories` | UI/client state; no direct API named | P0 |
| RM-11 | ux-admin-content | Resource filters | Choose Approved/Pending/Rejected/Withdrawn/All Status | UI/client state; no direct API named | P0 |
| RM-12 | ux-admin-content | Resource sort | Choose `Newest first` | UI/client state; no direct API named | P0 |
| RM-13 | ux-admin-content | Resource sort | Choose `Oldest first` | UI/client state; no direct API named | P0 |
| RM-14 | ux-admin-content | Resource sort | Choose `Title A–Z` | UI/client state; no direct API named | P0 |
| RM-15 | ux-admin-content | Resource sort | Choose `Title Z–A` | UI/client state; no direct API named | P0 |
| RM-16 | ux-admin-content | Resource filters | Toggle `★ Featured only` | UI/client state; no direct API named | P0 |
| RM-17 | ux-admin-content | Resource filters | Activate Search submit button or Enter | /api/admin/resources | P0 |
| RM-18 | ux-admin-content | Resource filters | Activate `Clear filters` icon | UI/client state; no direct API named | P0 |
| RM-19 | ux-admin-content | Resources header checkbox | Toggle `Select all resources on this page` | UI/client state; no direct API named | P2 |
| RM-20 | ux-admin-content | Resource row | Toggle row checkbox | UI/client state; no direct API named | P0 |
| RM-21 | ux-admin-content | Resource selection bar | Activate `Clear Selection` | UI/client state; no direct API named | P0 |
| RM-22 | ux-admin-content | Resource selection bar | Open bulk `Approve` | UI/client state; no direct API named | P0 |
| RM-23 | ux-admin-content | Bulk Approve dialog | Cancel | /api/admin/resources/bulk/approve | P0 |
| RM-24 | ux-admin-content | Bulk Approve confirmation | Confirm approval | /api/admin/resources/bulk/approve | P0 |
| RM-25 | ux-admin-content | Resource selection bar | Open bulk `Reject` | UI/client state; no direct API named | P0 |
| RM-26 | ux-admin-content | Bulk Reject dialog | Enter short and valid reasons | UI/client state; no direct API named | P0 |
| RM-27 | ux-admin-content | Bulk Reject dialog | Cancel | /api/admin/resources/bulk/reject | P0 |
| RM-28 | ux-admin-content | Bulk Reject confirmation | Confirm rejection | /api/admin/resources/bulk/reject | P0 |
| RM-29 | ux-admin-content | Resource selection bar | Open bulk `Delete` | UI/client state; no direct API named | P0 |
| RM-30 | ux-admin-content | Bulk Delete dialog | Cancel | /api/admin/resources/bulk/delete | P0 |
| RM-31 | ux-admin-content | Bulk Delete confirmation | Confirm deletion | /api/admin/resources/bulk/delete | P0 |
| RM-32 | ux-admin-content | Resource row Featured cell | Toggle star on a QA row and induce failure | /api/admin/resources/:id/featured | P2 |
| RM-33 | ux-admin-content | Resource row | Activate `View` | UI/client state; no direct API named | P0 |
| RM-34 | ux-admin-content | Resource row | Activate `Edit` | /api/resources/:id | P0 |
| RM-35 | ux-admin-content | Resource row | Activate `Delete` | UI/client state; no direct API named | P0 |
| RM-36 | ux-admin-content | Delete Resource dialog | Cancel | /api/admin/resources/:id | P0 |
| RM-37 | ux-admin-content | Delete Resource confirmation | Delete the auditor's own QA row by ID | /api/admin/resources/:id | P2 |
| RM-38 | ux-admin-content | Delete Resource confirmation | Delete a pre-existing production resource | UI/client state; no direct API named | P0 |
| RM-39 | ux-admin-content | Resources pagination | Choose 25, 50, and 100 rows per page | UI/client state; no direct API named | P0 |
| RM-40 | ux-admin-content | Resources paginator | Use Previous, Next, and numbered page links | UI/client state; no direct API named | P0 |
| RM-41 | ux-admin-content | Resources page-number input | Type a page and press Enter | UI/client state; no direct API named | P0 |
| RM-42 | ux-admin-content | Resources page-number input | Commit on blur; try invalid and out-of-range values | UI/client state; no direct API named | P0 |
| RM-43 | ux-admin-content | Resources deep links | Open `?create=1`, `?resourceId=N`, `?status=rejected`, and `?page=N`, then reload | UI/client state; no direct API named | P0 |
| RM-44 | ux-admin-content | Edit Resource | Change `Title *` | UI/client state; no direct API named | P0 |
| RM-45 | ux-admin-content | Edit Resource | Change `URL *`, including duplicate URL | UI/client state; no direct API named | P2 |
| RM-46 | ux-admin-content | Edit Resource | Change `Description` | UI/client state; no direct API named | P0 |
| RM-47 | ux-admin-content | Edit Resource | Change `Category` | UI/client state; no direct API named | P0 |
| RM-48 | ux-admin-content | Edit Resource | Change `Status` among Approved/Pending/Rejected | UI/client state; no direct API named | P0 |
| RM-49 | ux-admin-content | Edit Resource, rejected status | Edit `Rejection reason *` | UI/client state; no direct API named | P2 |
| RM-50 | ux-admin-content | Edit Resource | Change `Subcategory` | UI/client state; no direct API named | P0 |
| RM-51 | ux-admin-content | Edit Resource | Change `Sub-subcategory` | UI/client state; no direct API named | P0 |
| RM-52 | ux-admin-content | Edit Resource | Change `Kind override`, including Automatic | /api/admin/resources/:id/kind | P2 |
| RM-53 | ux-admin-content | Edit Resource | Toggle `Curated placement` | /api/admin/resources/:id/featured | P2 |
| RM-54 | ux-admin-content | Edit Resource | Change `Format` | UI/client state; no direct API named | P0 |
| RM-55 | ux-admin-content | Edit Resource | Change `Provider` | UI/client state; no direct API named | P0 |
| RM-56 | ux-admin-content | Edit Resource | Change `Skill level` | UI/client state; no direct API named | P0 |
| RM-57 | ux-admin-content | Edit Resource footer | Activate `Save Changes` on a QA row | /api/admin/resources/:id | P0 |
| RM-58 | ux-admin-content | Edit Resource footer | Activate `Cancel` | UI/client state; no direct API named | P0 |
| RM-59 | ux-admin-content | Add Resource | Edit `Title *` | UI/client state; no direct API named | P0 |
| RM-60 | ux-admin-content | Add Resource | Edit `URL *`, including duplicate URL | UI/client state; no direct API named | P2 |
| RM-61 | ux-admin-content | Add Resource | Edit `Description` | UI/client state; no direct API named | P0 |
| RM-62 | ux-admin-content | Add Resource | Choose required `Category *` | UI/client state; no direct API named | P2 |
| RM-63 | ux-admin-content | Add Resource | Choose `Status` | UI/client state; no direct API named | P0 |
| RM-64 | ux-admin-content | Add Resource | Choose `Subcategory` | UI/client state; no direct API named | P0 |
| RM-65 | ux-admin-content | Add Resource | Choose `Sub-subcategory` | UI/client state; no direct API named | P0 |
| RM-66 | ux-admin-content | Add Resource | Choose `Kind override` | UI/client state; no direct API named | P0 |
| RM-67 | ux-admin-content | Add Resource | Toggle `Feature this resource` | UI/client state; no direct API named | P0 |
| RM-68 | ux-admin-content | Add Resource | Choose `Format` | UI/client state; no direct API named | P0 |
| RM-69 | ux-admin-content | Add Resource | Choose `Provider` | UI/client state; no direct API named | P0 |
| RM-70 | ux-admin-content | Add Resource | Choose `Skill level` | UI/client state; no direct API named | P0 |
| RM-71 | ux-admin-content | Add Resource footer | Activate `Create Resource` with `[QA-audit-1026]` title | /api/admin/resources | P0 |
| RM-72 | ux-admin-content | Add Resource footer | Activate `Cancel` | /api/admin/resources | P0 |
| RM-73 | ux-admin-content | Create/Edit Resource | Exercise client validation, pending, and server-failure states | UI/client state; no direct API named | P2 |
| RM-74 | ux-admin-content | Edit Resource footer | Activate `Save Changes` on a pre-existing production resource | /api/admin/resources/:id | P0 |
| CAT-01 | ux-admin-content | `/admin#categories` | Load category list | /api/admin/categories | P2 |
| CAT-02 | ux-admin-content | Categories | Activate `Retry` after list failure | UI/client state; no direct API named | P2 |
| CAT-03 | ux-admin-content | Categories | Search with no matches | UI/client state; no direct API named | P0 |
| CAT-04 | ux-admin-content | Categories | Inspect populated rows | /api/awesome-list/nav | P0 |
| CAT-05 | ux-admin-content | Categories header | Toggle `Search`/`Hide search` | UI/client state; no direct API named | P0 |
| CAT-06 | ux-admin-content | Categories search | Type name/slug query | UI/client state; no direct API named | P0 |
| CAT-07 | ux-admin-content | Categories search | Activate `Clear search` | UI/client state; no direct API named | P0 |
| CAT-08 | ux-admin-content | Categories header | Open `Add category` | UI/client state; no direct API named | P2 |
| CAT-09 | ux-admin-content | Create Category | Edit `Name *` | UI/client state; no direct API named | P0 |
| CAT-10 | ux-admin-content | Create Category | Edit `Slug *` after auto-generation | UI/client state; no direct API named | P0 |
| CAT-11 | ux-admin-content | Create Category footer | Submit with `[QA-audit-1026]` name | /api/admin/categories | P0 |
| CAT-12 | ux-admin-content | Create Category footer | Cancel | /api/admin/categories | P0 |
| CAT-13 | ux-admin-content | Create Category | Submit empty name and duplicate slug | UI/client state; no direct API named | P2 |
| CAT-14 | ux-admin-content | Category row | Activate `Edit` | UI/client state; no direct API named | P0 |
| CAT-15 | ux-admin-content | Edit Category | Change `Name *` | UI/client state; no direct API named | P0 |
| CAT-16 | ux-admin-content | Edit Category | Change `Slug *` | UI/client state; no direct API named | P0 |
| CAT-17 | ux-admin-content | Edit Category footer | Save a QA category | /api/admin/categories/:id | P0 |
| CAT-18 | ux-admin-content | Edit Category footer | Cancel | /api/admin/categories/:id | P0 |
| CAT-19 | ux-admin-content | Edit Category | Submit empty name or duplicate slug | UI/client state; no direct API named | P2 |
| CAT-20 | ux-admin-content | Category row delete flow | Open, cancel, then delete own empty QA category | /api/admin/categories/:id | P2 |
| CAT-21 | ux-admin-content | Category row delete confirmation | Delete a pre-existing category | UI/client state; no direct API named | P0 |
| CAT-22 | ux-admin-content | Categories pagination | Change rows per page and use numbered/Previous/Next/jump controls | UI/client state; no direct API named | P0 |
| CAT-23 | ux-admin-content | Edit Category footer | Save a pre-existing category | /api/admin/categories/:id | P0 |
| SC-01 | ux-admin-content | `/admin#subcategories` | Load subcategories | /api/admin/subcategories | P2 |
| SC-02 | ux-admin-content | Subcategories | Activate `Retry` after list failure | UI/client state; no direct API named | P2 |
| SC-03 | ux-admin-content | Subcategories | Search with no matches | UI/client state; no direct API named | P0 |
| SC-04 | ux-admin-content | Subcategories | Inspect populated rows | /api/awesome-list/nav | P0 |
| SC-05 | ux-admin-content | Subcategories header | Toggle `Search`/`Hide search` | UI/client state; no direct API named | P0 |
| SC-06 | ux-admin-content | Subcategories search | Type name/slug query | UI/client state; no direct API named | P0 |
| SC-07 | ux-admin-content | Subcategories search | Activate `Clear search` | UI/client state; no direct API named | P0 |
| SC-08 | ux-admin-content | Subcategories header | Open `Add subcategory` | UI/client state; no direct API named | P0 |
| SC-09 | ux-admin-content | Create Subcategory | Choose `Parent Category *` | /api/admin/categories | P0 |
| SC-10 | ux-admin-content | Create Subcategory | Edit `Name *` | UI/client state; no direct API named | P0 |
| SC-11 | ux-admin-content | Create Subcategory | Edit `Slug *` | UI/client state; no direct API named | P0 |
| SC-12 | ux-admin-content | Create Subcategory footer | Submit with `[QA-audit-1026]` name | /api/admin/subcategories | P0 |
| SC-13 | ux-admin-content | Create Subcategory footer | Cancel | /api/admin/subcategories | P0 |
| SC-14 | ux-admin-content | Create Subcategory | Submit missing parent/name or duplicate slug | UI/client state; no direct API named | P2 |
| SC-15 | ux-admin-content | Subcategory row | Activate `Edit` | UI/client state; no direct API named | P0 |
| SC-16 | ux-admin-content | Edit Subcategory | Change `Name *` | UI/client state; no direct API named | P0 |
| SC-17 | ux-admin-content | Edit Subcategory | Change `Slug *` | UI/client state; no direct API named | P0 |
| SC-18 | ux-admin-content | Edit Subcategory | Change `Parent Category *` | UI/client state; no direct API named | P0 |
| SC-19 | ux-admin-content | Edit Subcategory footer | Save a QA subcategory | /api/admin/subcategories/:id | P0 |
| SC-20 | ux-admin-content | Edit Subcategory footer | Cancel | /api/admin/subcategories/:id | P0 |
| SC-21 | ux-admin-content | Edit Subcategory | Submit invalid fields or duplicate slug | UI/client state; no direct API named | P2 |
| SC-22 | ux-admin-content | Subcategory row delete flow | Open, cancel, then delete own empty QA subcategory | /api/admin/subcategories/:id | P2 |
| SC-23 | ux-admin-content | Subcategory row delete confirmation | Delete a pre-existing subcategory | UI/client state; no direct API named | P0 |
| SC-24 | ux-admin-content | Subcategories pagination and parent errors | Use 24-row page control/paginator; activate parent-load `Retry` | UI/client state; no direct API named | P2 |
| SC-25 | ux-admin-content | Edit Subcategory footer | Save a pre-existing subcategory | /api/admin/subcategories/:id | P0 |
| SSC-01 | ux-admin-content | `/admin/subsubcategories` or Settings → Sub-Subcats | Load list | /api/admin/sub-subcategories | P2 |
| SSC-02 | ux-admin-content | Sub-Subcategories | Activate `Retry` after list failure | UI/client state; no direct API named | P2 |
| SSC-03 | ux-admin-content | Sub-Subcategories | Search with no matches | UI/client state; no direct API named | P0 |
| SSC-04 | ux-admin-content | Sub-Subcategories | Inspect populated rows | UI/client state; no direct API named | P0 |
| SSC-05 | ux-admin-content | Sub-Subcategories header | Toggle `Search`/`Hide search` | UI/client state; no direct API named | P0 |
| SSC-06 | ux-admin-content | Sub-Subcategories search | Type name/slug query | UI/client state; no direct API named | P0 |
| SSC-07 | ux-admin-content | Sub-Subcategories search | Activate `Clear search` | UI/client state; no direct API named | P0 |
| SSC-08 | ux-admin-content | Sub-Subcategories header | Open `Add sub-subcategory` | UI/client state; no direct API named | P0 |
| SSC-09 | ux-admin-content | Create Sub-Subcategory | Choose `Parent Category *` | UI/client state; no direct API named | P0 |
| SSC-10 | ux-admin-content | Create Sub-Subcategory | Choose `Parent Subcategory *` | /api/admin/subcategories | P2 |
| SSC-11 | ux-admin-content | Create Sub-Subcategory | Edit `Name *` | UI/client state; no direct API named | P0 |
| SSC-12 | ux-admin-content | Create Sub-Subcategory | Edit `Slug *` | UI/client state; no direct API named | P0 |
| SSC-13 | ux-admin-content | Create Sub-Subcategory footer | Submit with `[QA-audit-1026]` name | /api/admin/sub-subcategories | P0 |
| SSC-14 | ux-admin-content | Create Sub-Subcategory footer | Cancel | /api/admin/sub-subcategories | P0 |
| SSC-15 | ux-admin-content | Create Sub-Subcategory | Submit missing parents/name or duplicate slug | UI/client state; no direct API named | P2 |
| SSC-16 | ux-admin-content | Sub-Subcategory row | Activate `Edit` | UI/client state; no direct API named | P0 |
| SSC-17 | ux-admin-content | Edit Sub-Subcategory | Change `Name *` | UI/client state; no direct API named | P0 |
| SSC-18 | ux-admin-content | Edit Sub-Subcategory | Change `Slug *` | UI/client state; no direct API named | P0 |
| SSC-19 | ux-admin-content | Edit Sub-Subcategory | Change parent Category, then parent Subcategory | UI/client state; no direct API named | P0 |
| SSC-20 | ux-admin-content | Edit Sub-Subcategory footer | Save a QA row | /api/admin/sub-subcategories/:id | P0 |
| SSC-21 | ux-admin-content | Edit Sub-Subcategory footer | Cancel | /api/admin/sub-subcategories/:id | P0 |
| SSC-22 | ux-admin-content | Edit Sub-Subcategory | Submit invalid fields or duplicate slug | UI/client state; no direct API named | P2 |
| SSC-23 | ux-admin-content | Sub-Subcategory row delete flow | Open, cancel, then delete own empty QA row | /api/admin/sub-subcategories/:id | P2 |
| SSC-24 | ux-admin-content | Sub-Subcategory row delete confirmation | Delete a pre-existing row | UI/client state; no direct API named | P0 |
| SSC-25 | ux-admin-content | Sub-Subcategories pagination and parent errors | Change page size/use paginator; activate parent-load `Retry` | UI/client state; no direct API named | P2 |
| SSC-26 | ux-admin-content | Edit Sub-Subcategory footer | Save a pre-existing row | /api/admin/sub-subcategories/:id | P0 |
| JN-01 | ux-admin-content | `/admin/journeys` | Load journeys | /api/admin/journeys | P2 |
| JN-02 | ux-admin-content | Journeys list | Activate `Retry` after failure | UI/client state; no direct API named | P2 |
| JN-03 | ux-admin-content | Journeys list | Load with no journeys | UI/client state; no direct API named | P2 |
| JN-04 | ux-admin-content | Journeys list | Inspect populated journeys | /api/admin/journeys | P0 |
| JN-05 | ux-admin-content | Journey row | Activate `Steps` | /api/admin/journeys/:id/steps | P0 |
| JN-06 | ux-admin-content | Journey Steps dialog | Load steps | UI/client state; no direct API named | P2 |
| JN-07 | ux-admin-content | Journey Steps dialog | Activate `Retry` after request failure | UI/client state; no direct API named | P2 |
| JN-08 | ux-admin-content | Journey Steps dialog offline | Activate `Retry` | UI/client state; no direct API named | P2 |
| JN-09 | ux-admin-content | Journey Steps dialog | Open journey with zero steps | UI/client state; no direct API named | P2 |
| JN-10 | ux-admin-content | Journey Steps dialog | Inspect populated grouped steps | UI/client state; no direct API named | P0 |
| JN-11 | ux-admin-content | Journey Steps dialog | Open `Add step` | UI/client state; no direct API named | P2 |
| JN-12 | ux-admin-content | Step editor | Edit `Title *`, including blank | UI/client state; no direct API named | P0 |
| JN-13 | ux-admin-content | Step editor | Edit `Description` | UI/client state; no direct API named | P0 |
| JN-14 | ux-admin-content | Step editor resource picker | Toggle `Pick resource`/`Change`/`Close picker` | /api/resources?limit=10 | P0 |
| JN-15 | ux-admin-content | Resource picker | Type a title search | /api/resources?search=…&limit=10 | P0 |
| JN-16 | ux-admin-content | Resource picker results | Choose a resource | /api/resources/:id | P0 |
| JN-17 | ux-admin-content | Resource picker selected badge | Activate `Clear resource` | UI/client state; no direct API named | P0 |
| JN-18 | ux-admin-content | Resource picker | Exercise no-results, error, offline, and `Retry` | UI/client state; no direct API named | P2 |
| JN-19 | ux-admin-content | Step editor | Toggle `Mark this step as optional` | UI/client state; no direct API named | P0 |
| JN-20 | ux-admin-content | Add Step footer | Confirm `Add step` on a real journey | /api/admin/journeys/:id/steps | P0 |
| JN-21 | ux-admin-content | Step editor footer | Cancel Add/Edit | UI/client state; no direct API named | P0 |
| JN-22 | ux-admin-content | Journey step | Activate `Move … up` | /api/admin/journeys/:id/steps/reorder | P0 |
| JN-23 | ux-admin-content | Journey step | Activate `Move … down` | /api/admin/journeys/:id/steps/reorder | P0 |
| JN-24 | ux-admin-content | Linked journey resource | Activate resource link | UI/client state; no direct API named | P0 |
| JN-25 | ux-admin-content | Multi-resource step | Open remove-resource, cancel, or confirm removal | /api/admin/journeys/:journeyId/steps/:stepId | P0 |
| JN-26 | ux-admin-content | Journey step | Open `Edit`, change fields, and save | UI/client state; no direct API named | P0 |
| JN-27 | ux-admin-content | Journey step | Open `Delete`, cancel, or confirm | UI/client state; no direct API named | P0 |
| JN-28 | ux-admin-content | Journey step mutations | Inspect failure copy on a non-production fixture | UI/client state; no direct API named | P2 |
| JN-29 | ux-admin-content | Journey manager and step dialogs | Complete keyboard, 44px-target, focus-return, and reduced-motion sweep | UI/client state; no direct API named | P2 |
| EN-01 | ux-admin-ai | `/admin#enrichment` stats | Inspect Last enriched, Queue, and Avg cost | /api/enrichment/jobs | P2 |
| EN-02 | ux-admin-ai | Enrichment jobs | Initial load | /api/enrichment/jobs | P2 |
| EN-03 | ux-admin-ai | Enrichment jobs | Activate `Retry` after list failure | UI/client state; no direct API named | P2 |
| EN-04 | ux-admin-ai | Enrichment jobs | Load with no jobs | UI/client state; no direct API named | P2 |
| EN-05 | ux-admin-ai | Enrichment jobs | Inspect populated table | UI/client state; no direct API named | P1 |
| EN-06 | ux-admin-ai | Enrichment `Job controls & monitoring` | Expand/collapse details | UI/client state; no direct API named | P1 |
| EN-07 | ux-admin-ai | Enrichment jobs | Toggle `Show all N jobs`/`Show fewer` | UI/client state; no direct API named | P1 |
| EN-08 | ux-admin-ai | Enrichment Run job controls | Open Run job from header or Job Control | UI/client state; no direct API named | P1 |
| EN-09 | ux-admin-ai | Job Control | Choose `All Resources` or `Unenriched Only` | /api/admin/enrichment/coverage | P1 |
| EN-10 | ux-admin-ai | Job Control | Enter batch size 1–50 | UI/client state; no direct API named | P1 |
| EN-11 | ux-admin-ai | Job Control | Enter blank, fractional, 0, negative, or >50 batch size | UI/client state; no direct API named | P2 |
| EN-12 | ux-admin-ai | Job Control | Toggle advanced enrichment settings | UI/client state; no direct API named | P1 |
| EN-13 | ux-admin-ai | Advanced enrichment | Edit `Model` | /api/health/ai | P1 |
| EN-14 | ux-admin-ai | Advanced enrichment | Edit `Base URL` | UI/client state; no direct API named | P1 |
| EN-15 | ux-admin-ai | Advanced enrichment | Edit `Auth Token` | UI/client state; no direct API named | P1 |
| EN-16 | ux-admin-ai | Start Enrichment confirmation | Cancel | /api/enrichment/start | P1 |
| EN-17 | ux-admin-ai | Start Enrichment confirmation | Confirm `Start enrichment` | /api/enrichment/start | P1 |
| EN-18 | ux-admin-ai | Start Enrichment confirmation | Open with zero resources matching filter | UI/client state; no direct API named | P1 |
| EN-19 | ux-admin-ai | Enrichment launch guards | Inspect active job, loading jobs, and failed jobs states | UI/client state; no direct API named | P2 |
| EN-20 | ux-admin-ai | Start Enrichment confirmation | Inspect failed start on non-production | UI/client state; no direct API named | P2 |
| EN-21 | ux-admin-ai | Enrichment active job | Observe pending/processing progress | UI/client state; no direct API named | P2 |
| EN-22 | ux-admin-ai | Active enrichment job | Open `Cancel` | UI/client state; no direct API named | P1 |
| EN-23 | ux-admin-ai | Cancel Enrichment dialog | Choose `Keep running` | /api/enrichment/jobs/:id | P1 |
| EN-24 | ux-admin-ai | Cancel Enrichment confirmation | Confirm cancellation | /api/enrichment/jobs/:id | P1 |
| EN-25 | ux-admin-ai | Cancel Enrichment dialog | Inspect cancellation failure on non-production | UI/client state; no direct API named | P2 |
| EN-26 | ux-admin-ai | Enrichment job row | Open `Logs` | /api/enrichment/jobs/:id | P1 |
| EN-27 | ux-admin-ai | Enrichment Job Details | Load selected job | UI/client state; no direct API named | P2 |
| EN-28 | ux-admin-ai | Enrichment Job Details | Activate `Retry` after detail failure | UI/client state; no direct API named | P2 |
| EN-29 | ux-admin-ai | Enrichment Job Details | Inspect populated configuration/statistics/resources/errors and close | UI/client state; no direct API named | P2 |
| EN-30 | ux-admin-ai | Job Details Agent Graph and Agent Events | Inspect loading, waiting, empty, populated, and failed states | /api/enrichment/jobs/:id/events | P2 |
| EN-31 | ux-admin-ai | Agent Events | Expand/collapse a structured event and navigate by keyboard | UI/client state; no direct API named | P1 |
| RS-01 | ux-admin-ai | `/admin#researcher` Brief step | Choose `Auto-generate at launch` | UI/client state; no direct API named | P2 |
| RS-02 | ux-admin-ai | Researcher Brief step | Choose `Write my own` | UI/client state; no direct API named | P1 |
| RS-03 | ux-admin-ai | Custom brief | Activate `Start from a generated brief` | /api/researcher/brief | P2 |
| RS-04 | ux-admin-ai | Custom brief | Edit `Research brief` | UI/client state; no direct API named | P1 |
| RS-05 | ux-admin-ai | Researcher Focus step | Choose category or `All categories` | UI/client state; no direct API named | P1 |
| RS-06 | ux-admin-ai | Researcher Limits | Edit `Stop after (discoveries)` | UI/client state; no direct API named | P1 |
| RS-07 | ux-admin-ai | Researcher Limits | Edit `Budget cap (USD)` | UI/client state; no direct API named | P1 |
| RS-08 | ux-admin-ai | Researcher Limits | Edit `Max turns` | UI/client state; no direct API named | P1 |
| RS-09 | ux-admin-ai | Researcher Endpoint & model | Toggle advanced settings | UI/client state; no direct API named | P1 |
| RS-10 | ux-admin-ai | Advanced researcher | Edit `Orchestrator model` | /api/researcher/config?model=… | P1 |
| RS-11 | ux-admin-ai | Advanced researcher | Edit `Scout model` | UI/client state; no direct API named | P1 |
| RS-12 | ux-admin-ai | Advanced researcher | Edit `Base URL` | UI/client state; no direct API named | P1 |
| RS-13 | ux-admin-ai | Advanced researcher | Edit `Auth token` | UI/client state; no direct API named | P1 |
| RS-14 | ux-admin-ai | Advanced researcher plain HTTP | Toggle insecure-transport acknowledgement | UI/client state; no direct API named | P1 |
| RS-15 | ux-admin-ai | Researcher config preview | Change overrides and observe resolution | UI/client state; no direct API named | P1 |
| RS-16 | ux-admin-ai | Researcher config preview | Trigger `GET /api/researcher/config` failure | UI/client state; no direct API named | P2 |
| RS-17 | ux-admin-ai | Researcher config preview | Inspect current populated/preflight-blocked summaries | UI/client state; no direct API named | P1 |
| RS-18 | ux-admin-ai | Researcher active-run notice | Activate `Follow run #N` | UI/client state; no direct API named | P1 |
| RS-19 | ux-admin-ai | Researcher launch | Submit invalid brief/limits | /api/researcher/start | P1 |
| RS-20 | ux-admin-ai | Researcher launch | Open `Launch research run` with valid form | UI/client state; no direct API named | P1 |
| RS-21 | ux-admin-ai | Launch confirmation | Cancel | /api/researcher/start | P1 |
| RS-22 | ux-admin-ai | Launch confirmation | Confirm `Launch` | /api/researcher/start | P1 |
| RS-23 | ux-admin-ai | Researcher launch guards | Inspect loading/failed jobs, active run, preflight failure, and stale preview states | UI/client state; no direct API named | P2 |
| RS-24 | ux-admin-ai | Launch confirmation | Inspect failed launch on non-production | UI/client state; no direct API named | P2 |
| RS-25 | ux-admin-ai | Research run view | Open `?jobId=N` while detail loads | UI/client state; no direct API named | P2 |
| RS-26 | ux-admin-ai | Research run view missing ID | Open nonexistent `?jobId=N`, then `Start another run` | UI/client state; no direct API named | P2 |
| RS-27 | ux-admin-ai | Research run view | Activate `Retry` after non-404 detail failure | /api/researcher/jobs/:id | P2 |
| RS-28 | ux-admin-ai | Active research run | Observe phase timeline and discovery/turn/spend meters | UI/client state; no direct API named | P1 |
| RS-29 | ux-admin-ai | Active research run | Open `Cancel run` | UI/client state; no direct API named | P1 |
| RS-30 | ux-admin-ai | Cancel Research Run dialog | Dismiss/keep run | /api/researcher/jobs/:id | P1 |
| RS-31 | ux-admin-ai | Cancel Research Run confirmation | Confirm cancellation | /api/researcher/jobs/:id | P1 |
| RS-32 | ux-admin-ai | Research run polling | Interrupt job/events/discoveries poll after good data | UI/client state; no direct API named | P2 |
| RS-33 | ux-admin-ai | Research run completed | Inspect completion outcome and review focus | UI/client state; no direct API named | P2 |
| RS-34 | ux-admin-ai | Research run failed/cancelled | Inspect terminal failure/cancel outcome | UI/client state; no direct API named | P2 |
| RS-35 | ux-admin-ai | Research run budget stopped | Activate `Relaunch with a higher cap` | UI/client state; no direct API named | P1 |
| RS-36 | ux-admin-ai | Research run discoveries | Observe active-empty and ended-empty states | UI/client state; no direct API named | P2 |
| RS-37 | ux-admin-ai | Research run discoveries | Activate `Retry` after discovery-load failure | /api/researcher/discoveries?jobId=N | P2 |
| RS-38 | ux-admin-ai | Research run discovery | Inspect populated item and open external URL | UI/client state; no direct API named | P1 |
| RS-39 | ux-admin-ai | Discovery review (run, pending table, job details) | Confirm `Approve` | /api/researcher/discoveries/:id/approve | P1 |
| RS-40 | ux-admin-ai | Discovery review | Open `Reject`, edit optional reason, then Cancel | UI/client state; no direct API named | P1 |
| RS-41 | ux-admin-ai | Reject Discovery confirmation | Confirm rejection | /api/researcher/discoveries/:id/reject | P1 |
| RS-42 | ux-admin-ai | Ended research run | Activate `Done` or `Review later — go to job history` | UI/client state; no direct API named | P1 |
| RS-43 | ux-admin-ai | Research run view | Activate `Start another run` | UI/client state; no direct API named | P1 |
| RS-44 | ux-admin-ai | Research run details | Toggle raw event log and agent graph region | UI/client state; no direct API named | P1 |
| RS-45 | ux-admin-ai | Research run detail tabs | Switch `Event log` and `Agent graph`; expand an event | /api/researcher/jobs/:id/events | P2 |
| RS-46 | ux-admin-ai | Researcher canonical jobs | Exercise loading/error/empty/populated states and `Show more`/`Load more` | /api/researcher/jobs?limit=N | P2 |
| RS-47 | ux-admin-ai | `All pending discoveries & full job history` | Expand details and switch `Review Discoveries`/`Job History` | UI/client state; no direct API named | P1 |
| RS-48 | ux-admin-ai | Pending discoveries | Exercise loading/error/empty/populated states | /api/researcher/discoveries | P2 |
| RS-49 | ux-admin-ai | Pending discoveries | Open `Approve All`, then Cancel | UI/client state; no direct API named | P1 |
| RS-50 | ux-admin-ai | Approve All confirmation | Confirm bulk approval | /api/researcher/discoveries/approve-all | P1 |
| RS-51 | ux-admin-ai | Full Job History | Use `Load more`, open row Details, or open active-job Cancel | UI/client state; no direct API named | P1 |
| RS-52 | ux-admin-ai | Research Job Details dialog | Inspect loading/error/populated discoveries/log/graph states and close | UI/client state; no direct API named | P2 |
| RS-53 | ux-admin-ai | Researcher end-to-end input/motion/offline sweep | Keyboard-walk launch, run, discovery, history, and dialog controls at 820/390 | UI/client state; no direct API named | P2 |
| GH-01 | ux-admin-ai | `/admin#github` repository card | Load `GET /api/config` | UI/client state; no direct API named | P2 |
| GH-02 | ux-admin-ai | GitHub repository config | Activate `Retry` after config failure | /api/config | P2 |
| GH-03 | ux-admin-ai | GitHub repository config | Load with no configured repository | UI/client state; no direct API named | P1 |
| GH-04 | ux-admin-ai | GitHub repository card | Open `Pull` with valid target | UI/client state; no direct API named | P1 |
| GH-05 | ux-admin-ai | GitHub Pull confirmation | Cancel | /api/github/import | P1 |
| GH-06 | ux-admin-ai | GitHub Pull confirmation | Confirm `Start Import` | /api/github/import | P1 |
| GH-07 | ux-admin-ai | GitHub repository card | Open `Sync now` with valid target | UI/client state; no direct API named | P1 |
| GH-08 | ux-admin-ai | GitHub Sync confirmation | Cancel | /api/github/export | P1 |
| GH-09 | ux-admin-ai | GitHub Sync confirmation | Confirm `Start Export` | /api/github/export | P1 |
| GH-10 | ux-admin-ai | GitHub `More` | Toggle More/Less | UI/client state; no direct API named | P1 |
| GH-11 | ux-admin-ai | Target Repository editor | Enter valid `owner/repository` or GitHub URL | UI/client state; no direct API named | P1 |
| GH-12 | ux-admin-ai | Target Repository editor | Enter invalid repository | UI/client state; no direct API named | P2 |
| GH-13 | ux-admin-ai | Target Repository editor | Activate `Reset to configured repository` | UI/client state; no direct API named | P1 |
| GH-14 | ux-admin-ai | GitHub Sync Status | Observe loading and no-activity states | UI/client state; no direct API named | P2 |
| GH-15 | ux-admin-ai | GitHub Sync Status | Inspect pending, processing, completed, failed, partial, and committed-despite-error rows | /api/github/sync-status | P2 |
| GH-16 | ux-admin-ai | GitHub Sync Status | Activate `Retry` after queue failure | UI/client state; no direct API named | P2 |
| GH-17 | ux-admin-ai | GitHub Sync jobs history | Activate `Retry` after history failure | /api/github/sync-history | P2 |
| GH-18 | ux-admin-ai | Last sync / history detail | Activate `View Commit on GitHub` | UI/client state; no direct API named | P1 |
| GH-19 | ux-admin-ai | Sync jobs row | Open `Logs` | UI/client state; no direct API named | P2 |
| GH-20 | ux-admin-ai | Sync job details | Inspect partial/failed errors, then close | UI/client state; no direct API named | P2 |
| GH-21 | ux-admin-ai | Sync jobs history | Load successful empty history | UI/client state; no direct API named | P2 |
| GH-22 | ux-admin-ai | Sync jobs history | Inspect populated rows and More/Less full-list behavior | UI/client state; no direct API named | P1 |
| GH-23 | ux-admin-ai | GitHub dry-run API (no current UI control in 480a3ace) | `POST /api/admin/import-github` with `{repoUrl, dryRun:true, strictMode}` variants | UI/client state; no direct API named | P2 |
| RW-01 | ux-admin-ai | `/admin#research` | Load research notes | /api/researcher/jobs?limit=4 | P2 |
| RW-02 | ux-admin-ai | Research workspace | Activate `Retry` after notes failure | UI/client state; no direct API named | P2 |
| RW-03 | ux-admin-ai | Research workspace | Load with no jobs | UI/client state; no direct API named | P2 |
| RW-04 | ux-admin-ai | Research workspace | Inspect populated notes | UI/client state; no direct API named | P1 |
| RW-05 | ux-admin-ai | Research note | Open note | /api/researcher/jobs/:id | P1 |
| RW-06 | ux-admin-ai | Research note dialog | Load selected job detail | UI/client state; no direct API named | P2 |
| RW-07 | ux-admin-ai | Research note dialog | Activate `Retry` after detail failure | UI/client state; no direct API named | P2 |
| RW-08 | ux-admin-ai | Research note dialog | Activate `Review candidates for job #N` | UI/client state; no direct API named | P1 |
| RW-09 | ux-admin-ai | Research note dialog | Close via X/Escape | UI/client state; no direct API named | P1 |
| EX-01 | ux-admin-ops | `/admin#export` `Validation controls` | Expand/collapse details | UI/client state; no direct API named | P1 |
| EX-02 | ux-admin-ops | Export validation controls | Open `Run Validation` | UI/client state; no direct API named | P1 |
| EX-03 | ux-admin-ops | Export job confirmation | Cancel validation | /api/admin/validate | P1 |
| EX-04 | ux-admin-ops | Export job confirmation | Confirm `Run validation` | /api/admin/validate | P1 |
| EX-05 | ux-admin-ops | Export validation controls | Open `Run Link Check` | UI/client state; no direct API named | P1 |
| EX-06 | ux-admin-ops | Export job confirmation | Cancel link check | /api/admin/check-links | P1 |
| EX-07 | ux-admin-ops | Export job confirmation | Confirm `Run link check` | /api/admin/check-links | P1 |
| EX-08 | ux-admin-ops | Export link-check panel | Observe pending/processing/completed/failed/cancelled states | /api/admin/link-health/status | P1 |
| EX-09 | ux-admin-ops | Export link-check panel | Activate `Retry` after status failure | UI/client state; no direct API named | P2 |
| EX-10 | ux-admin-ops | Export link-check panel | Activate `Open Link Health for problem links` | UI/client state; no direct API named | P1 |
| EX-11 | ux-admin-ops | Export active link check | Activate `Cancel link check` | /api/admin/link-health/jobs/:id | P1 |
| EX-12 | ux-admin-ops | Export JSON Snapshot card | Activate `Download` | /api/admin/export-json | P1 |
| EX-13 | ux-admin-ops | Export CSV card | Activate `Download` | /api/admin/export-csv | P1 |
| EX-14 | ux-admin-ops | Export README.md card | Activate `Generate` | /api/admin/export | P1 |
| EX-15 | ux-admin-ops | Export OPML card | Activate `Download` | /api/admin/export-opml | P1 |
| EX-16 | ux-admin-ops | All four export cards | Exercise offline and live 5xx failures for JSON/CSV/Markdown/OPML | UI/client state; no direct API named | P2 |
| EX-17 | ux-admin-ops | `Export history & validation results` | Expand/collapse details | UI/client state; no direct API named | P1 |
| EX-18 | ux-admin-ops | Export history pagination | Activate `Previous exports` | /api/admin/audit-logs?actions=… | P1 |
| EX-19 | ux-admin-ops | Export history pagination | Activate `Next exports` | UI/client state; no direct API named | P1 |
| EX-20 | ux-admin-ops | Export history | Exercise loading, error+Retry, zero-total, empty-page, and populated states | UI/client state; no direct API named | P2 |
| EX-21 | ux-admin-ops | Validation Results | Load with no stored awesome-lint result | UI/client state; no direct API named | P2 |
| EX-22 | ux-admin-ops | Validation Results | Inspect populated valid/invalid summaries | /api/admin/validation-status | P1 |
| EX-23 | ux-admin-ops | Validation Results | Toggle `Errors (N)` | UI/client state; no direct API named | P2 |
| EX-24 | ux-admin-ops | Validation Results | Toggle `Warnings (N)` | UI/client state; no direct API named | P1 |
| EX-25 | ux-admin-ops | Full database backup | Activate `Create backup` | /api/admin/database-backups | P1 |
| EX-26 | ux-admin-ops | Full database backup list | Exercise loading, error+Retry, unconfigured, empty, and populated states | /api/admin/database-backups | P2 |
| EX-27 | ux-admin-ops | Latest database backup | Toggle `Show contents`/`Hide contents` | UI/client state; no direct API named | P1 |
| DB-01 | ux-admin-ops | `/admin#database` stats | Observe loading and populated Tables/Rows/Disk/Migrations | /api/admin/stats | P2 |
| DB-02 | ux-admin-ops | Database `Database seeding` | Expand/collapse details | UI/client state; no direct API named | P1 |
| DB-03 | ux-admin-ops | Database seeding | Open `Seed Database` | UI/client state; no direct API named | P1 |
| DB-04 | ux-admin-ops | Seed Database confirmation | Cancel | /api/admin/seed-database | P1 |
| DB-05 | ux-admin-ops | Seed Database confirmation | Confirm `Seed Database` | /api/admin/seed-database | P1 |
| DB-06 | ux-admin-ops | Database seeding | Open `Clear & Re-seed` | UI/client state; no direct API named | P1 |
| DB-07 | ux-admin-ops | Clear & Re-seed dialog | Type incorrect text, lowercase `reseed`, then exact `RESEED` | UI/client state; no direct API named | P1 |
| DB-08 | ux-admin-ops | Clear & Re-seed dialog | Cancel | /api/admin/seed-database | P1 |
| DB-09 | ux-admin-ops | Clear & Re-seed confirmation | Confirm with exact `RESEED` | /api/admin/seed-database | P1 |
| DB-10 | ux-admin-ops | Database seed result | Inspect success result on non-production | UI/client state; no direct API named | P1 |
| DB-11 | ux-admin-ops | Database seed result | Inspect partial-failure result on non-production | UI/client state; no direct API named | P2 |
| DB-12 | ux-admin-ops | Database seed result | Inspect request failure on non-production | UI/client state; no direct API named | P2 |
| DB-13 | ux-admin-ops | Database Tables panel | Inspect populated PostgreSQL table stats | UI/client state; no direct API named | P1 |
| DB-14 | ux-admin-ops | Database Tables panel | Observe missing stats/empty tableStats and upstream stats failure | UI/client state; no direct API named | P2 |
| US-01 | ux-admin-ops | `/admin/users` | Load users | /api/admin/users?page=1&limit=20 | P2 |
| US-02 | ux-admin-ops | Users table | Activate `Retry` after failure | UI/client state; no direct API named | P2 |
| US-03 | ux-admin-ops | Users table | Load empty catalog and zero search matches | UI/client state; no direct API named | P2 |
| US-04 | ux-admin-ops | Users table | Inspect populated rows | /api/admin/users | P1 |
| US-05 | ux-admin-ops | Users header | Toggle `Row actions`/`Hide row actions` | UI/client state; no direct API named | P1 |
| US-06 | ux-admin-ops | Users search | Type email or name | UI/client state; no direct API named | P1 |
| US-07 | ux-admin-ops | Users search | Activate `Clear user search` | UI/client state; no direct API named | P1 |
| US-08 | ux-admin-ops | Users header | Activate `Export CSV` | /api/admin/users/export | P2 |
| US-09 | ux-admin-ops | Users header | Inspect `Invite unavailable` disabled control | UI/client state; no direct API named | P1 |
| US-10 | ux-admin-ops | Users table | Activate `Sort by Name` repeatedly | UI/client state; no direct API named | P1 |
| US-11 | ux-admin-ops | Users table | Activate `Sort by Email` repeatedly | UI/client state; no direct API named | P1 |
| US-12 | ux-admin-ops | Users table | Activate `Sort by Role` repeatedly | UI/client state; no direct API named | P1 |
| US-13 | ux-admin-ops | Users table | Activate `Sort by Joined` repeatedly | UI/client state; no direct API named | P1 |
| US-14 | ux-admin-ops | User row email | Toggle Reveal/Mask email | UI/client state; no direct API named | P1 |
| US-15 | ux-admin-ops | Other user row | Activate `Edit` role | UI/client state; no direct API named | P1 |
| US-16 | ux-admin-ops | Role selector | Close without choosing | UI/client state; no direct API named | P1 |
| US-17 | ux-admin-ops | Role selector | Choose `User` or `Admin` | UI/client state; no direct API named | P1 |
| US-18 | ux-admin-ops | Change user role dialog | Cancel | /api/admin/users/:id/role | P1 |
| US-19 | ux-admin-ops | Change user role confirmation | Confirm `Change Role` | /api/admin/users/:id/role | P1 |
| US-20 | ux-admin-ops | Current admin row | Inspect self role/delete controls | UI/client state; no direct API named | P1 |
| US-21 | ux-admin-ops | Other user row | Activate `Delete` | UI/client state; no direct API named | P1 |
| US-22 | ux-admin-ops | Delete user dialog | Cancel | /api/admin/users/:id | P1 |
| US-23 | ux-admin-ops | Delete user confirmation | Confirm `Delete User` | /api/admin/users/:id | P1 |
| US-24 | ux-admin-ops | Users pagination | Activate Previous and Next at middle and edge pages | UI/client state; no direct API named | P1 |
| US-25 | ux-admin-ops | Users table | Swipe horizontally at 390/820 and reach Edit | UI/client state; no direct API named | P1 |
| LH-01 | ux-admin-ops | `/admin/linkhealth` | Initial load | UI/client state; no direct API named | P2 |
| LH-02 | ux-admin-ops | Link Health | Trigger failures in status/history/problem links/coverage, then `Retry` | UI/client state; no direct API named | P2 |
| LH-03 | ux-admin-ops | Link Health | Load before any scan completes | UI/client state; no direct API named | P2 |
| LH-04 | ux-admin-ops | Link Health | Inspect populated completed scan | UI/client state; no direct API named | P1 |
| LH-05 | ux-admin-ops | Link Health | Open any `Run Link Check`/`Run Check Now`/`Run full check` control | UI/client state; no direct API named | P1 |
| LH-06 | ux-admin-ops | Run Link Health confirmation | Cancel | /api/admin/link-health/run | P1 |
| LH-07 | ux-admin-ops | Run Link Health confirmation | Confirm `Run check` | /api/admin/link-health/run | P1 |
| LH-08 | ux-admin-ops | Link Health active scan | Observe pending/processing progress and polling | /api/admin/link-health/status | P1 |
| LH-09 | ux-admin-ops | Link Health active scan | Open `Cancel scan` | UI/client state; no direct API named | P1 |
| LH-10 | ux-admin-ops | Cancel scan dialog | Choose `Keep scanning` | /api/admin/link-health/jobs/:id | P1 |
| LH-11 | ux-admin-ops | Cancel scan confirmation | Confirm `Cancel scan` | UI/client state; no direct API named | P1 |
| LH-12 | ux-admin-ops | Link Health failed/cancelled scan | Inspect terminal reason and open `Run scan again` | UI/client state; no direct API named | P2 |
| LH-13 | ux-admin-ops | Link Health count tiles | Observe no-result state | UI/client state; no direct API named | P1 |
| LH-14 | ux-admin-ops | Link Health counts/status | Observe previous-completed snapshot and `degraded` status | UI/client state; no direct API named | P1 |
| LH-15 | ux-admin-ops | Member link reports | Choose `Open` status | /api/admin/link-reports?status=open | P1 |
| LH-16 | ux-admin-ops | Member link reports | Choose `Resolved` status | UI/client state; no direct API named | P1 |
| LH-17 | ux-admin-ops | Member link reports | Choose `Dismissed` status | UI/client state; no direct API named | P1 |
| LH-18 | ux-admin-ops | Member link reports | Exercise loading and error+Retry | UI/client state; no direct API named | P2 |
| LH-19 | ux-admin-ops | Member link reports | Load empty Open/Resolved/Dismissed lists | UI/client state; no direct API named | P2 |
| LH-20 | ux-admin-ops | Member link report row | Open resource title and external resource URL | UI/client state; no direct API named | P1 |
| LH-21 | ux-admin-ops | Open member link report | Activate `Resolve` | /api/admin/link-reports/:resourceId/:reporter | P1 |
| LH-22 | ux-admin-ops | Open member link report | Activate `Dismiss` | UI/client state; no direct API named | P1 |
| LH-23 | ux-admin-ops | Link Health Recent failures | Load with no failures, before a scan, and during a scan | UI/client state; no direct API named | P2 |
| LH-24 | ux-admin-ops | Link Health Recent failures | Open a populated resource title and external URL | UI/client state; no direct API named | P1 |
| LH-25 | ux-admin-ops | Link Health `More` | Toggle More/Less | UI/client state; no direct API named | P1 |
| LH-26 | ux-admin-ops | Link Health Summary | Activate `Run Check Now` | UI/client state; no direct API named | P1 |
| LH-27 | ux-admin-ops | Link Health Trends | Observe chart loading, populated tooltip/legend, and 390 below-fold layout | UI/client state; no direct API named | P2 |
| LH-28 | ux-admin-ops | Problem Links filter | Choose All Issues, Broken Links, Timeouts, Redirects, and Suspect | UI/client state; no direct API named | P2 |
| LH-29 | ux-admin-ops | Problem Links | Exercise loading, unavailable, and filtered-empty states | UI/client state; no direct API named | P2 |
| LH-30 | ux-admin-ops | Problem Links populated table | Scroll both axes and open resource/external links | UI/client state; no direct API named | P2 |
| LH-31 | ux-admin-ops | Member link reports | Inspect failed resolve/dismiss on non-production | UI/client state; no direct API named | P2 |
| LH-32 | ux-admin-ops | Link Health and reports | Complete keyboard, real-touch, reduced-motion, and horizontal/vertical sweep | UI/client state; no direct API named | P2 |
| DG-01 | ux-admin-ops | `/admin/digests` | Load delivery health | /api/admin/digests/health | P2 |
| DG-02 | ux-admin-ops | Digest delivery health | Activate `Retry` after initial failure | UI/client state; no direct API named | P2 |
| DG-03 | ux-admin-ops | Digest delivery health | Fail a poll after a good snapshot | UI/client state; no direct API named | P1 |
| DG-04 | ux-admin-ops | Digest delivery health | Activate `Refresh` | UI/client state; no direct API named | P1 |
| DG-05 | ux-admin-ops | Digest delivery health | Inspect populated transport, queue, totals, and failure codes | /api/admin/digests/health | P2 |
| DG-06 | ux-admin-ops | Digest jobs by channel/status | Load with no digest jobs | UI/client state; no direct API named | P2 |
| DG-07 | ux-admin-ops | Recent digest failures | Load with no recent failure codes | UI/client state; no direct API named | P2 |
| AU-01 | ux-admin-ops | `/admin#audit` | Load audit log | /api/admin/audit-logs?limit=25&offset=0 | P2 |
| AU-02 | ux-admin-ops | Audit log | Activate `Retry` after failure | UI/client state; no direct API named | P2 |
| AU-03 | ux-admin-ops | Audit log | Load with no matching entries | UI/client state; no direct API named | P2 |
| AU-04 | ux-admin-ops | Audit log | Inspect populated rows | UI/client state; no direct API named | P1 |
| AU-05 | ux-admin-ops | Audit header | Toggle audit tools | UI/client state; no direct API named | P1 |
| AU-06 | ux-admin-ops | Audit Resource ID filter | Enter blank or positive int4 ID and submit | UI/client state; no direct API named | P1 |
| AU-07 | ux-admin-ops | Audit Resource ID filter | Enter 0, nonnumeric, negative, or >int4 value | UI/client state; no direct API named | P1 |
| AU-08 | ux-admin-ops | Audit tools | Choose 25/50/100/200 rows and apply | UI/client state; no direct API named | P1 |
| AU-09 | ux-admin-ops | Audit tools | Activate Search button or Enter | /api/admin/audit-logs | P1 |
| AU-10 | ux-admin-ops | Audit active filter | Activate `Clear` | UI/client state; no direct API named | P2 |
| AU-11 | ux-admin-ops | Audit tools | Activate `Refresh` | UI/client state; no direct API named | P1 |
| AU-12 | ux-admin-ops | Audit pagination | Activate `Previous` | UI/client state; no direct API named | P1 |
| AU-13 | ux-admin-ops | Audit pagination | Activate `Next` | UI/client state; no direct API named | P1 |
| AU-14 | ux-admin-ops | Audit row | Activate row via click, Enter, or Space | UI/client state; no direct API named | P1 |
| AU-15 | ux-admin-ops | Audit row ID cell | Activate `View details for audit entry N` | UI/client state; no direct API named | P1 |
| AU-16 | ux-admin-ops | Audit entry dialog | Close via X/Escape | UI/client state; no direct API named | P1 |
| AU-17 | ux-admin-ops | Audit status chips | Inspect create/update/delete, auth.*, recommendation invalid, unknown, and degraded rows | UI/client state; no direct API named | P2 |
| AU-18 | ux-admin-ops | Contact submissions | Load inbox | /api/admin/contact-submissions?limit=20&offset=0 | P2 |
| AU-19 | ux-admin-ops | Contact submissions 404 | Activate `Retry` | UI/client state; no direct API named | P2 |
| AU-20 | ux-admin-ops | Contact submissions failure | Activate `Retry` after non-404 failure | UI/client state; no direct API named | P2 |
| AU-21 | ux-admin-ops | Contact submissions | Load successful empty inbox | UI/client state; no direct API named | P2 |
| AU-22 | ux-admin-ops | Contact submissions | Inspect populated inbox | UI/client state; no direct API named | P1 |
| AU-23 | ux-admin-ops | Contact submissions pagination | Activate Previous and Next | UI/client state; no direct API named | P1 |
| AU-24 | ux-admin-ops | Contact submission row | Open via click, Enter, or Space | UI/client state; no direct API named | P1 |
| AU-25 | ux-admin-ops | Contact submission detail | Toggle `Reveal/Mask reply-to email` | UI/client state; no direct API named | P1 |
| AU-26 | ux-admin-ops | Contact submission detail revealed email | Activate `mailto:` link | UI/client state; no direct API named | P1 |
| AU-27 | ux-admin-ops | Contact submission detail | Close via X/Escape | UI/client state; no direct API named | P1 |
