**Verdict: ISSUES, with large open gaps.** I returned early because I was running low on budget. Of the 55 rows, 13 are partly driven, 4 have a verdict and 42 are not driven at all. The rows that need a member or admin session were not attempted.

Production revision was `bc1797b065c1989ab92f512633f69bf3fe25e718` at start (18:49Z) and at end (19:08Z). It did not change.

I drove signed-out in agent-browser session `L01` with `umami.disabled=1`. I changed no settings and created no QA rows, so there is nothing to delete or restore.

## Findings

| id | severity | URL | width | saw vs expected | evidence | source |
|---|---|---|---|---|---|---|
| T6-01-01 | LOW | `/subcategory/codecs?filter=general` and `/sub-subcategory/av1` | 1440 | The sidebar link for the current page has `aria-current="page"`, but the parent "Codecs" link is not marked as an ancestor. This is cosmetic. | `pc011-1440-aria-current.txt` | `AppSidebar.tsx` |
| T6-01-02 | LOW | `/` (compact rail) | 1100×600 | The rail's last link ("Source") sits at bottom=692 on a 600px viewport. It is reachable only by scrolling the rail (reached bottom=588 after scrolling). Pressing Tab 14 times from Expand ended on "Standards" (bottom=152), so I did not confirm keyboard reachability of the last link. | `pc012-1100x600-last-link.txt` | `AppSidebar.tsx` (`.av-sidebar-icon-rail`) |

I did not log a defect for the mobile drawer "More navigation" summary. It sits at y=2164 inside a 844px dialog. A first real pointer click landed on the backdrop and closed the drawer. After `scrollIntoView` the same click worked. That was my tool, not the product. Still, the summary is below the fold of the drawer on first open. It is worth a human look as a discoverability problem.

I could not tell whether T6-01-02 is a defect. The rail is scrollable, but the brief's PC-012 wording ("last link is reachable") needs a keyboard check that I did not finish.

## Row matrix

| row | verdict | widths driven | evidence (prefix `L01/`) |
|---|---|---|---|
| C6-PC-001 | PARTIAL | 1440 and 390 and 820 for a failed or aborted `/api/auth/user` | `pc001-1440-navfail*`, `pc001-1440-retry-recovered.*`, `pc001-390-authconfigfail*`, `pc001-390-retry-recovered-a11y.txt`, `pc001-820-authfail.png` |
| C6-PC-005 | PARTIAL | 1440 click-through; 820 and 390 attributes only | `pc005-1440-guest-nav.txt`, `pc005-1440-click-through.txt`, `pc005-820-nav.txt` |
| C6-PC-007 | NOT DRIVEN (member session) | none | none |
| C6-PC-008 | PARTIAL | 1440, 390, 820 | `pc008-1440-more-links.txt`, `pc008-390-drawer-more-links.txt`, `pc008-820-drawer-more-links.txt` |
| C6-PC-009 | PARTIAL | 1440, 390, 820 | `pc009-1440-after-reload.txt`, `pc009-011-390-drawer.txt`, `pc009-011-820-drawer.txt` |
| C6-PC-010 | PARTIAL | 1440, 390, 820 | `pc010-1440-nested.txt`, `pc010-1440-nested.png`, `pc009-011-*-drawer.txt` |
| C6-PC-011 | PARTIAL | 1440; 390 and 820 for the AV1 leaf only | `pc011-1440-av1.txt`, `pc011-1440-uncat.*`, `pc011-390-av1.png`, `pc011-820-av1.png` |
| C6-PC-012 | PARTIAL | 1100, 1200, 1250, 1440 | `pc012-compact-flow.txt`, `pc012-expand-state.txt`, `pc012-1100x600-last-link.txt` |
| C6-PC-013 | PARTIAL | 390 (820 only for More links); guest only | `pc013-390-drawer-a11y.txt`, `pc013-390-search-result.png`, `pc013-390-links.txt` |
| C6-PC-014 | PARTIAL | 1440 (retry via `/categories`) | `pc014-1440-navfail*`; I did not drive the loading skeleton or the genuine empty state |
| C6-PC-038 | PARTIAL | 1440 | `pc038-1440-structure.txt`, `pc038-1440-category-top.png` |
| C6-PC-015, 016, 017, 025 to 037 | NOT DRIVEN | none | none |
| C6-PC-039 to 066 | NOT DRIVEN | none | none |

Within the partial rows, here is what I saw:
- **PC-001:** The `/categories` page shows "Couldn't load categories" with a Retry button when the nav request is aborted. Retry refires `/api/awesome-list/nav` and recovers. At 390, when auth and config are aborted, a banner reads "couldn't verify your sign-in status. You can keep browsing as a guest." Its Retry button is 44px high, and Retry cleared the banner at both 390 and 820. I did not test the loading state at the three widths.
- **PC-005:** Guest nav hrefs, `aria-current` and Docs `target=_blank` with `rel=noopener noreferrer` are correct at 1440. Browse, Submit and About navigate correctly. Clicking Docs opened a second tab (`/design-system`). The header nav links are hidden below 1100 (width 0), so the drawer carries them. I did not test member or admin visibility.
- **PC-008, PC-009, PC-010:** The More links navigate correctly at all three widths and the disclosure closes. `aria-expanded` and `av-sb-cats` toggle. Focus stays on the nested toggle after it is used. I did not capture the persisted state after reload at 1440: the `aria-expanded` read-back came back empty, though the post-reload snapshot shows `expanded=true`. The More-link `aria-current` was present for Submit, Journeys, Advanced, Theme and About. The "Home dashboard" link had none.
- **PC-012:** Collapse and expand move focus to the counterpart control, the category and Home icons route, and the rail is 55px wide with 44×44 targets. I did not verify that the mode persists across reload.
- **PC-013:** A non-blank query goes to `/search?q=ffmpeg`. A blank or whitespace submit does nothing. Each Home, Submit and About link closes the drawer. I did not test member or admin variants.
- **PC-038:** Browse back, breadcrumbs and child tiles route correctly across category, subcategory and sub-subcategory. I did not test siblings, parent tile, or kind preservation, and did not drive 820 or 390.

## Not done
- Rows that need a member or admin session: PC-007, plus the member parts of PC-005 and PC-013, and the member and admin parts of the later rows (049, 053 to 058 and others). I did not use the owner cookie jar.
- Offline, loading and chunk-failure states, and the 404 and legacy-alias rows.
- The Home rows, the taxonomy tools, facets and pagination rows, `/tag/:slug`, `/resource/:id` and all resource actions.
- `/collection/:shareId`, guest `/bookmarks` and the Share (native or fallback) row.

I used no scripts or harnesses and created no QA rows. Evidence is in `/Users/nick/Desktop/awesome-list-site/reports/prod-audit-2026-10-26/cycle-06/takeover-lanes/L01/`.