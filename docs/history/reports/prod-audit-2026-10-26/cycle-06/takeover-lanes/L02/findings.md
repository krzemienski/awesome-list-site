**Verdict: ISSUES.** I drove most of the 49 rows. I found 5 defects. About 20 rows are partly driven or blocked, and those are marked in the matrix. Production stayed on `bc1797b065c1989ab92f512633f69bf3fe25e718` at start (18:49Z) and end (19:27Z), so nothing needed re-driving.

I drove with agent-browser in session L02, signed out with analytics disabled. I used a separate read-only session, L02M, with the owner cookie header, only to view `/continue-learning` and `/recommendations`. I clicked no write control there. Evidence is in `reports/prod-audit-2026-10-26/cycle-06/takeover-lanes/L02/` (PNGs, `dl/` downloads, and `notes.jsonl`, my running per-row log; the matrix below is the canonical record).

## Findings

| id | sev | URL / width | Saw vs expected | evidence | likely source |
|---|---|---|---|---|---|
| T6-02-01 | Medium | `/search?q=video&category=Media+Tools&sort=bogus`, 1440 | The active-filters "Clear all" button leaves `sort=bogus`, so the page stays on "Invalid filters". The row expects "Clear all incl. unsupported sort" to clear it. | `PS-006-after-clear-1440.png` | `client/src/pages/Search.tsx:141` (`clearFilters(includeSort=false)`; `onClear` at lines 280/282 never passes true) |
| T6-02-02 | Low | same URL, 1440 | "Clear invalid filters" wipes the query and every filter. The URL goes to `/search`. The row expects the query not to be wiped unintentionally. | notes.jsonl (PS-006) | `Search.tsx:177` (`readState("")`, `setInput("")`) |
| T6-02-03 | Low | `/journey/7` guest, 390 and 820 | The "log in" link is 36x21 px, below the 44px touch minimum. | notes.jsonl (PS-059) | journey detail `button-login-journey` |
| T6-02-04 | Low | `/settings` signed out, 1440 and 820 | The two Home layout radios are 16x16 px. Their `<label>` wrapper is about 332x80 px, so the click area is fine, but the bare control fails a literal target-size sweep. | `PS-059-settings-820.png` | settings Home layout radios |
| T6-02-05 | Low | `/advanced?tab=export` (24x24 checkboxes) and `/privacy` "Open cookie settings" (141x24), 390 | At 390 the checkboxes are 24px, with 44px label wrappers and `::after` hit areas. The cookie-settings button is 24px high with no 44px hit area. Touch controls must be 44px. | `PS-059-export-390.png`, notes.jsonl | export option checkboxes, `button-privacy-cookie-settings` |

Smaller target-size notes:
- "PRs welcome" in the footer is 73x24 at every width. That is a 24px minimum, not a 44px touch target.
- "Use phone" on `/sign-in` at 1440 is 62x16 with 17px to its nearest neighbour. That is below the 24px minimum with no spacing exception. I count it as Clerk's widget, not our code.

## Row matrix

"Guest" and "member" mean the state I drove. Dates under `dl/` are downloads.

| row | verdict | widths | evidence |
|---|---|---|---|
| PS-001 | PASS | 1440 | `PS-001-1440.png` (`?q=a` shows "Query too short", facets still load) |
| PS-002 | PASS | 1440, 820, 390 | `PS-002-palette-open-1440.png`, `PS-002-390-after-escape.png` |
| PS-003 | PASS | 1440 | all 5 sorts reorder results and update the URL, relevance drops `sort`, Back restores |
| PS-004 | PASS | 1440 | `PS-004-subsub-selected-1440.png`; parent toggle clears child filters; slug `encoding-codecs` resolves to the canonical name; pressed state and counts agree |
| PS-005 | PARTIAL | 390, 1440 | `PS-005-sheet-390.png`, `PS-005-tags-390b.png`. The sheet, focus returning to Filters on Done, tag search and the "24 of 302 tags" cap note work. The Provider, Format and Skill groups don't render, and I couldn't test them. |
| PS-006 | FAIL | 1440 | T6-02-01 and T6-02-02. Removing a chip works. |
| PS-007 | PARTIAL | 1440 | guest title, View Details, Open Link and the sign-in-required favorite/bookmark/edit buttons work. Member behaviour not driven. |
| PS-008 | PASS (guest) | 1440 | Next, page 19, jump to 99 clamps, "abc" gives an inline error, `page=999` clamps with a notice. The jump input wasn't focused or cleared after a bad jump. |
| PS-009 | PASS | 1440 | `PS-009-empty-1440.png`; the popular categories are real `/category/*` links |
| PS-010 | PASS | 1440 | `PS-010-after-suggest-1440.png` (focus returns to the input) |
| PS-011 | PARTIAL | 1440 | `PS-011-offline-1440.png`, `PS-011-overlimit-1440.png`. Offline, "Still offline" on Retry, auto-recovery on reconnect, 600-char query "too long" at 512, and a script-like query all pass. A server-error state (500) not forced. |
| PS-012 | PASS | 1440 | `?tab=` and `sub` round trip with Back/Forward |
| PS-013 | PASS | 1440 | `PS-013-search-1440.png`; sort by name, count and activity verified by card order; Show subcategories checkbox verified |
| PS-014 | PASS | 1440 | `PS-014-tags-1440x2000.png`; selected tags beyond the first 20 stay visible; Clear all works |
| PS-015 | PASS | 1440 | `PS-015-collapsed-1440.png`, `PS-015-tagfilter-1440.png`; the cards show "N matches" under a tag filter |
| PS-018 | PARTIAL | 1440 | `dl/ps018-json-nodesc-notags.json` has no description or tags keys. I didn't toggle the categories and grouping options. |
| PS-020 | PARTIAL | 1440 | `dl/ps020-*`: six nonempty valid files (PDF is 13 pages), HTML has no script, CSV has no formula-leading cells. The "Export Successful" toast appeared. A PDF spinner wasn't seen. |
| PS-021 | BLOCKED | 1440 | `PS-021-error-1440.png`. I aborted `**/api/**` and `**clerk**` and the page still rendered because the data is server-embedded. The loading, error and empty states couldn't be induced. |
| PS-022 | PASS | 1440 | "Browse All Resources" goes to `/categories`; "Explore Categories" goes to `/category/community-events` |
| PS-023 | PASS | 1440 | `PS-023-empty-1440.png`; filter category, `?category=` restore, 0-count empty state, Clear filter returns all 5 and focus goes to the combobox |
| PS-024 | PARTIAL | 1440 | guest Start Journey opens `/journey/7` read-only with no POST. The member POST is BLOCKED-BY-POLICY. |
| PS-025 | PASS | 1440 | `PS-025-detail-guest-1440.png`; Back to Journeys goes to the hub; the login link keeps path and query |
| PS-026 | BLOCKED | n/a | BLOCKED-BY-POLICY: enrolment writes the owner's account |
| PS-027 | PASS (guest) | 1440 | journeys 6 to 10 have unique resource links with no duplicates; internal opens; external links `noopener noreferrer` and 44px |
| PS-028 | BLOCKED | n/a | BLOCKED-BY-POLICY (progress PUT) |
| PS-029 | PARTIAL | 1440 | `/journey/99999` and `/journey/abc` show the shared 404. Loading, error, offline and zero-step states not driven. |
| PS-030 | PASS | 1440 | `PS-030-guest-1440.png`; Sign in carries `redirect_url=/continue-learning` |
| PS-031 | BLOCKED | n/a | BLOCKED-BY-POLICY (resume POST) |
| PS-032 | PARTIAL | 1440 member (read-only) | `PS-032-member-continue-1440.png`; the API counts match the page; recent resource links are real |
| PS-033 | PARTIAL | 1440 member | empty, loading, error and offline states not driven |
| PS-034 | PASS | 1440 | `PS-034-guest-1440.png`; `GET /api/recommendations?limit=12`; sign-in link returns to `/recommendations` |
| PS-035 | PARTIAL | 1440 member | `PS-035-member-recs-1440.png`; "Edit learning preferences" goes to `/settings#learning-preferences`; Refresh not clicked |
| PS-036 | PARTIAL | 1440 member | "Why this?" opens with signals; View resource is `_blank noopener noreferrer`. Position recording not checked. |
| PS-037 | BLOCKED | n/a | BLOCKED-BY-POLICY (feedback PUT). The four controls exist with `aria-pressed=false`. |
| PS-038 | BLOCKED | n/a | states not inducible: server-embedded data, and the member session is not mine to break |
| PS-042 | PASS | 1440 | `PS-042-cookie-reopen-1440.png`; legal links work; cookie settings reopens consent. `/api/config` says email is unavailable and issues is available. |
| PS-043 | PARTIAL | 1440 guest | `PS-043-ds2-1440.png`, `PS-043-lime-plex-1440.png`; roving ArrowRight works; theme persists via localStorage across reload. The member PUT was not driven. |
| PS-044 | PASS | 1440 | `PS-044-geist-lime-1440.png`; the `--accent` token re-derives live; the preview is `ARTICLE[inert]`; the back link works. Only 2 systems exist. |
| PS-045 | PASS | 1440 | `PS-045-signedout-1440.png`, `PS-045-curated-home-1440.png`; home layout persists in localStorage. I restored it to "index". |
| PS-046 | PARTIAL | 1440, 820, 390 | `PS-046-signin-{1440,820,390}.png`; the Clerk widget loads; `login`/`forgot-password`/`reset-password`/`auth/login` map `next` to `redirect_url`; `//evil`, `https://` and `javascript:` values drop. Completing sign-in is BLOCKED-BY-POLICY. `/auth` itself is a 404, but `/auth/login` works. |
| PS-047 | PARTIAL | 390 | `PS-047-signup-390.png`; the sign-up page loads; completing sign-up is BLOCKED-BY-POLICY (no account creation) |
| PS-048 | PARTIAL | 1440 | `PS-048-admin-1440.png`; the empty submit is disabled. Wrong, valid and rate-limited submits BLOCKED-BY-POLICY (`/sign-in?admin` must not be submitted). |
| PS-049 | BLOCKED | n/a | `PS-049-unavailable-1440.png`; aborting clerk requests had no effect, so the unavailable state can't be induced |
| PS-050 | PARTIAL | 1440 | `/logout` as guest goes to `/`. I could not force the failure path. |
| PS-051 | PARTIAL | 1440 | guest redirects to `/sign-in?redirect_url=` keep path, query and hash for profile, contributions, notifications, onboarding, admin and `admin/users`. Non-admin member not testable (the owner is an admin). |
| PS-054 | PARTIAL | 1440, 820, 390 | `PS-054-dialog-*.png`, `PS-054-invalid-390.png`; fields are 44px; invalid input keeps its values with 0 POSTs; focus is on name; Esc closes. A valid submit is BLOCKED (it stores a real contact row with no delete path). Only the live config was driven. Variants A–E are not toggleable. |
| PS-057 | PASS | 390, 820, 1440 | with reduced-motion emulation on: no infinite animations, `scroll-behavior:auto`, on 9 pages at 1440 and 4 at each of 390/820. The Filters sheet opens and closes by Esc. |
| PS-058 | PARTIAL | 1440 | I tabbed `/search` for 16 stops: logical order, 2 to 3px solid outlines, no trap. The rest of the secondary pages and all dialogs were not walked. |
| PS-059 | PARTIAL | 1440, 820, 390 | I swept the interactive elements on the pages listed, with findings T6-02-03 to 05. Contact dialog and other dialog controls not swept. |

## QA rows and settings

- **QA rows created:** none, so nothing to delete.
- **Settings changed:** all in my own L02 browser session. The `awesome-video-home-layout` localStorage key went from unset to `curated`, then back to `index`. The theme went from Editorial/Crimson to Geist/Cyan/Violet/Lime and back to Editorial/Crimson. Nothing was changed on a real account, and the owner session was never signed out.

## Not driven

- Loading, error and offline states on `/advanced`, `/journey/:id` and `/continue-learning`.
- PS-033, PS-038 and PS-049 couldn't be induced.
- PS-026, PS-028, PS-031 and PS-037 are blocked by policy.
- PS-007 member behaviour; PS-058 beyond `/search`; PS-018 categories and grouping toggles; PS-020 double-click and PDF spinner.
- Contact variants A–E; a valid contact submit.
- Search 400 and 500 states.