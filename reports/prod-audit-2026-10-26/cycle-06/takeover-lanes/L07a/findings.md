ISSUES: all 12 L07a rows are now driven at every width they need. 10 pass and 2 fail, both Low severity. A third finding is a Low accessibility gap that L07 already reported, still present at all widths. Production stayed on `bc1797b065c1989ab92f512633f69bf3fe25e718` from start (19:24:01Z) to end (19:45:02Z).

The earlier rate-limited L07a attempt left files in `L07a/` but no verified matrix, so I re-drove every row myself. My evidence is in `/Users/nick/Desktop/awesome-list-site/reports/prod-audit-2026-10-26/cycle-06/takeover-lanes/L07a/r2/`.

**Tool issues, and what I used instead:**
- In this session, `agent-browser network requests` captured nothing and `network route --abort` did not abort, with two different URL patterns.
- For write checks I used an in-page fetch wrapper that logs only method, URL and status (never headers). It also failed the categories GET on demand for CAT-02.
- For CAT-01 I used a second session of mine, `L07a-load`, with the previous attempt's `delay-init.js`, which holds that GET for 9 seconds. That session is closed.
- `agent-browser console` returned 0 entries, so console state is **unverified**, not clean.
- I typed with real keystrokes and Backspace. Control+a does not select all on this host, which is what produced the previous attempt's stray rows.

## 1. Findings

| id | sev | URL | width | saw vs expected | evidence | likely source |
|---|---|---|---|---|---|---|
| T6-07a-01 | Low | `/admin#categories`, Create Category | 1440 (logic is width-independent) | **Saw:** I typed a name, then changed the slug to `qa-audit-1026-override-custom`, then added " X" to the name. The slug silently became `qa-audit-1026-override-x`. **Expected (CAT-10):** a manual slug overrides the auto-generated one. This reproduced with real keystrokes, so it is not the fill-tool artifact. L07 logged it as Info (T6-07-02). | `r2/cat10-override-lost-1440.png` | `client/src/components/admin/GenericCrudManager.tsx:2538-2539`: `handleNameChange` always sets `slug: generateSlug(name)` and does not track whether the slug was edited by hand. |
| T6-07a-02 | Low | `/admin#categories`, search with no matches | 390 | **Saw:** the no-match text spans x=253 to 460, but the visible scroll area ends at x=323, so only "No categor" shows. The full message needs a sideways swipe. The "Showing 0-0 of 0 results (filtered from 9)" line above it is fully visible. **Expected (CAT-03):** an explicit, readable no-match row. At 820 it is fully visible. | `r2/cat03-nomatch-390.png` | `GenericCrudManager.tsx:2833-2838`: the cell spans all columns of a 672px table inside a 302px scroll area and is centred. |
| (T6-07-01, still open) | Low | Create dialog, empty slug | 390, 820, 1440 | `#create-slug-error` "Slug is required" has no `role=alert` and no `aria-live` (DOM read gives `role=null live=null`). `aria-invalid` and `aria-describedby` are set, and focus does move to the slug field. | `r2/cat10-required-{390,820,1440}.png` | `GenericCrudManager.tsx`. Grep did not find the error element. |

## 2. Row matrix

| row | verdict | widths driven | evidence (under `L07a/r2/`) |
|---|---|---|---|
| CAT-01 | PASS | 1440, 820, 390 | `cat01-loading-{1440,820,390}.png`: 5 skeleton bars while the GET is held, 9 rows after it lands. |
| CAT-02 | PASS | 820, 390 | **Without stale rows:** `cat02-error-{820,390}.png` shows "Couldn't load categories" plus Retry, with no empty or no-match row. **With stale rows:** `cat02-stale-{820,390}.png` adds "The list below may be out of date." and keeps 10 rows. **Retry:** while still failing it reissued the GET (log shows ABORTED twice). After I removed the fault, Retry got a 200 and the rows came back. |
| CAT-03 | FAIL (T6-07a-02 at 390) | 820 PASS, 390 FAIL | `cat03-nomatch-{820,390}.png`: "Showing 0-0 of 0 results (filtered from 9 or 10)". |
| CAT-04 | PASS | 1440, 820, 390 | `cat04-{1440,820,390}.json/.png`, `cat04-390-scrolled.png`, `cat04-reconcile.txt`. **Counts:** each category's admin resource and subcategory counts match the sum of its `/api/awesome-list/nav` entries (total 3826). **Icons:** rendered per slug (lucide, `aria-hidden`); no API carries an icon field. **At 390:** columns are reachable through a labelled, focusable scroll region. |
| CAT-05 | PASS | 820, 390 | **Open:** label flips to "Hide search", `aria-expanded=true`, focus moves to the input. **Hide:** `aria-expanded=false`, input becomes `visibility:hidden`, focus stays on the toggle. **Size:** 100x44 / 69x44. |
| CAT-06 | PASS | 1440, 820, 390 | **Name search:** "codecs" and "media" each gave one row. **Slug search:** "-delivery", "players-cl" and "intro-" each gave one row. **Client-side:** the log shows 0 fetches while typing. **Page reset:** from page 2, typing "-" gave "Page 1 of 2, Showing 1-10 of 11 results (filtered from 11)" at all three widths. Screenshots: `cat06-reset-{820,390}.png`, `cat06-name-1440.png`. |
| CAT-07 | PASS | 820, 390 | Clear search (44x44) empties the query, keeps search open, focuses the input, and restores all rows. |
| CAT-08 | PASS | 820, 390 | **Dialog:** empty, focus on `#create-name`, no non-GET request. **Targets:** buttons and inputs at least 44px tall. Screenshot: `cat09-dialog-820.png`. |
| CAT-09 | PASS | 820, 390 | "[QA-audit-1026] Café Ünï Ætest r390/r820" became `qa-audit-1026-cafe-uni-aetest-r390/r820` (Ü→u, ï→i, Æ→ae). |
| CAT-10 | FAIL (T6-07a-01) | 1440, 820, 390 | **Works:** "Slug is required" shows, `aria-invalid=true`, focus moves to the slug field after a short delay, no POST, and a typed slug replaces the auto one. **Fails:** the override is lost on a later name edit. Screenshots: `cat10-required-*.png`, `cat10-override-lost-1440.png`. |
| CAT-11 | PASS | 820, 390 | **390:** POST returned 201 (id 1211), then nav and admin GETs fired, the header changed 9→10, and public `/api/categories` listed 1211. **820:** POST returned 201 (id 1212), the toast read "Category created", and the header showed 11. Screenshots: `cat11-created-{390,820}.png`. |
| CAT-12 | PASS | 1440, 820, 390 | Cancel closes the dialog with no POST, focus returns to "Add category", reopening shows empty fields, and Escape also sends no write. |

## 3. QA rows created and deleted

| id | name | outcome |
|---|---|---|
| 1211 | `[QA-audit-1026] Cat r390` | `DELETE /api/admin/categories/1211` returned 200 |
| 1212 | `[QA-audit-1026] Cat r820` | `DELETE /api/admin/categories/1212` returned 200 |

Re-read (`r2/cleanup-reread.txt`):
- Public `/api/categories/{1208,1209,1210,1211,1212}` all return 404.
- Public `/api/categories` has 9 entries, identical to the start baseline (id, name, slug, count).
- Admin `/api/admin/categories` has 9 entries, identical to the start baseline, with no QA rows.
- After a reload, the UI shows "9 top-level domains" and 9 rows.

Log: `r2/qa-rows.log`.

## 4. Settings changed

None on the account.
- **Already set:** `umami.disabled=1` and `analytics-consent=denied` in localStorage of my own sessions.
- **Session-local only:** the fetch delay (L07a-load) and the in-page fetch fault (L07a), both gone when the pages closed.
- **Sessions:** `L07a` and `L07a-load` are both closed.