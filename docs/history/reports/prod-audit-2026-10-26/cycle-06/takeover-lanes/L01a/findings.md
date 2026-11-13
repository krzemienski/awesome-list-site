**Verdict: ISSUES.** I drove all 12 rows. Nine are PASS, one is FAIL (PC-011), and PC-005, PC-007 and PC-014 are PARTIAL with named gaps. Production was `bc1797b065c1989ab92f512633f69bf3fe25e718` at the start (19:10Z) and the end (19:36Z), so no row needed a re-drive. I created no QA rows and changed no settings. The only state I changed was localStorage in my own browser sessions (`sidebar_state`, `umami.disabled`).

Evidence is in `/Users/nick/Desktop/awesome-list-site/reports/prod-audit-2026-10-26/cycle-06/takeover-lanes/L01a/`, plus the earlier L01 evidence in `../L01/`. The files are named by row prefix (`pc014-*`, `pc016-*` and so on).

**Findings**

| id | sev | URL | width | saw vs expected | evidence | likely source |
|---|---|---|---|---|---|---|
| T6-01a-01 | MEDIUM | `/`, `/category/*` sidebar | 1440, 820 touch, 390 drawer | The 44px "All in …" links (e.g. "All in Codecs") can only be clicked over a 9px strip. The box is 44px, but `margin-block:-11px -9px` makes the next 44px row cover it. Expected ≥24px on desktop and ≥44px on touch. At 820, 27 of 40 sidebar rows can be clicked over less than 44px. At 390 four drawer rows measure 38px effective (below the 44px touch minimum). | `pc-1440-all-in-codecs-hit.txt`, `pc-1440-eff-named.txt`, `pc-820-eff-named.txt`, `pc-390-drawer-below44.txt` | `client/src/styles/shell/sidebar-tree.css:280` (`.av-sidebar-l3-all`), `:274` (`.av-sidebar-l3-row`) |
| T6-01a-02 | LOW | drawer at 390 and 820, admin session | 390, 820 | The drawer's "Docs ↗" goes to `github.com/…/tree/master/docs`. The header "Docs ↗" goes to `/design-system` in a new tab. Same label, different destinations. The guest drawer has no Docs link, so I only saw the drawer one while signed in as the owner. | `pc013-owner-drawer.txt`, `pc005-docs-header.txt`, `pc005-docs-drawer-guest.txt` | `AppSidebar.tsx:1131`, `AppHeader.tsx:112` |

- **T6-01-02 from L01 is withdrawn.** With the rail focused, Tab 11 lands on "Source", whose rect is top 459, bottom 503 inside the 600px viewport. The row-12 rail checks are in `pc012-1100x600-tab-walk.txt` and `pc012-1100x600-source-focused.png`.
- **T6-01-01 from L01 stays LOW and cosmetic.** The parent link is not marked as an ancestor.
- **820 click that landed on the wrong row.** At 820 with the drawer open, `agent-browser click '[data-testid=subsub-codecs-uncategorized]'` resolved to the copy in the persistent sidebar. Its centre point hit a different row, and the click navigated to `/sub-subcategory/online-forums`. The persistent sidebar and the drawer share testids, so I treat this as probably my selector. It is consistent with T6-01a-01, though. Evidence is in `pc011-820-uncat-state.txt` and `pc011-820-overlap-debug.txt`. A real click on the drawer copy at 820 did reach the correct leaf: `pc011-820-uncat-state.txt` shows `aria-current=page` on the leaf and the drawer closed.

**Row matrix** (all evidence files are in L01a/ unless marked L01/)

| row | verdict | widths and states driven | evidence |
|---|---|---|---|
| C6-PC-001 | PASS | The sidebar skeleton showed before the data loaded at 1440 and 820 (Slow 3G, MutationObserver). The error state and a working Retry were driven at 1440, 820 and 390. A failed auth request still leaves a usable guest shell with a Retry banner (L01). I did not capture the loading state at 390. | `pc014-1440-loading-skeleton.txt`, `pc014-error-retry.txt`, L01 `pc001-*` |
| C6-PC-005 | PARTIAL | Guest at 1440, 820 and 390: hrefs, `aria-current` and Docs `target=_blank` are correct. Admin at 1440: Admin appears, goes to `/admin` and gets `aria-current=page`. The member case (Admin hidden for a non-admin) is BLOCKED because the owner session is an admin and I have no member session. The Docs mismatch is T6-01a-02. | `pc005-1440-owner-nav.txt`, `pc005-owner-admin-click.txt`, L01 `pc005-*` |
| C6-PC-007 | PARTIAL | Admin session at 1440, 820 and 390: Profile, Bookmarks, Notifications, Settings, Theme Settings and Admin each route correctly, and every item is 44px tall. `GET /api/notifications?limit=50` returns 200 with 0 unread and the UI shows no badge, which matches. Not driven: the unread badge with a nonzero count (the account has no notifications) and Sign out (BLOCKED-BY-POLICY, never sign out the owner). | `pc007-1440-items.txt`, `pc007-820-390.txt`, `pc007-badge.txt` |
| C6-PC-008 | PASS | Guest at 1440, 820 and 390 (L01). Admin at 1440: Submit, Journeys, Advanced, Theme, Home dashboard, About and Admin each navigate and close the More disclosure. | `pc008-1440-owner-links.txt`, L01 `pc008-*` |
| C6-PC-009 | PASS | 1440, 820 and 390. `aria-expanded` toggles and persists in `av-sb-cats`. | L01 `pc009-*`, `sidebar-dom-1440.json` |
| C6-PC-010 | PASS | 1440, 820 and 390. Focus stays on the nested toggle, which flips `aria-expanded` true to false. | L01 `pc010-*`, `pc011-390-uncat-state.txt` |
| C6-PC-011 | FAIL | Counts reconcile at 1440: 159 nodes checked against `/api/awesome-list/nav` and `/api/categories`, all match (a first run showed 10 mismatches that came from my parser reading the "L3" badge as digits). Category totals sum to 3826 and `sub-codecs` 68 = 9+22+18+19. The Uncategorized leaf URL is `?filter=general`, with `aria-current` correct at 390 and 820. The row fails on target size, T6-01a-01. | `pc011-count-reconcile-1440.txt`, `pc011-390-uncat-state.txt`, `pc011-820-uncat-state.txt` |
| C6-PC-012 | PASS | 1100, 1200, 1250 and 1440. Collapse and expand move focus to the counterpart and the mode persists across reload (`sidebar_state`). Category and Home icons route. Tab reaches "Source" at 1100×600. | `persist-compact-reload.txt`, `pc012-1100x600-tab-walk.txt`, `pc012-1100x600-source-focused.png` |
| C6-PC-013 | PASS | Guest (L01) and admin at 390 and 820: Home, Submit, About and Admin each navigate and close the drawer. Search behaviour is from L01 only: a non-blank query goes to `/search?q=…` and a blank one does nothing. | `pc013-owner-drawer.txt`, `pc-390-drawer-targets.txt` |
| C6-PC-014 | PARTIAL | Skeleton, `Couldn't load categories` with a 44px Retry, and recovery after Retry are confirmed. Retry fires `GET /api/awesome-list/nav`: that request showed up in the network log once at 1440, once at 390 and once at 820 (persistent sidebar). The genuine empty state ("No categories.") is BLOCKED: production never serves an empty tree, and a `--body` stub through `agent-browser network route` was ignored. Not driven: the 390 loading skeleton. | `pc014-error-retry.txt`, `pc014-820-retry-persistent.txt`, `pc014-1440-loading-skeleton.txt` |
| C6-PC-015 | PASS | 768 and 1000. The breadcrumb is `.sr-only` with every link at `tabindex=-1`, so a 25-press Tab walk finds no stops in it. The "Show 2 hidden breadcrumb levels" disclosure opens by keyboard and lists Encoding & Codecs and Next-Generation Codecs AV1 VVC. Home and the ancestor link resolve. 1279 not driven. I did not test a resource with no resolved ancestors. | `pc015-1000-breadcrumb-dom.txt`, `pc015-1000-tabwalk.txt`, `pc015-768-disclosure-keyboard.txt` |
| C6-PC-016 | PASS | 1440, 820 and 390. The button is absent at scrollY 300 and appears at 900 as a 44×44 control. At the page bottom it does not overlap footer links or the consent banner. Activating it returns to scrollY 0 with focus on the H1. | `pc016-all-widths.txt`, `pc016-820-390.txt`, `pc016-1440-bottom.png` |

**QA rows created and deleted:** none.

**Settings changed and restored:** none on any real account. Both sessions were left signed in.

**Not verified:**
- Member-role views (no non-admin session).
- The unread-badge count.
- Sign out.
- The genuine empty nav state.
- The loading skeleton at 390.
- A resource with no resolved ancestors.
- 1279 for PC-015.

I used no scripts or harnesses.