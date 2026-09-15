# Native click-through — 2026-09-15 (final run)

Driven end-to-end with the built-in browser tester against
`http://127.0.0.1:5000` (the public dev hostname routes to the design-system
artifact, so every session addressed the app port directly). No test files,
no harness replay. Screenshot export from the native browser is not supported
in this environment, so evidence is cited by artifact ID; there are no PNG
files for this run. Testers: `parity-admin-clickthrough`,
`parity-admin-census`, `parity-visitor-keyboard`, `parity-visitor-census`,
`parity-card-instances`.

Identities were exact-owned, `__qa_test_568_` prefixed, provisioned through
Clerk (sign-in via `/sign-in?__clerk_ticket=…`, JIT row id = Clerk user id),
and torn down at the end (see *Teardown*). No production write occurred.

## 1. Admin path — 18 tabs at 1440×900 and 375×812

Admin identity: `__qa_test_568_admin_…@example.com`, promoted to `admin` by a
`[DB]` step after JIT provisioning. Every tab of `/admin` was opened at both
widths; per-tab censuses (`button` / `a[href]` / `input`) were recorded on the
heavy tabs, safe read-only controls (filters, search, sort, pagination, dialog
open + Escape, Job History) were exercised, and no destructive/job/export action
was run outside the fixture approval in §2.

| Tab | 1440 | 375 | Census (1440 / 375) |
|---|---|---|---|
| Overview | `72l9x2` | `ypvlt2` | 19/9/0 · 20/4/0 |
| Approvals | `d2wowc` | `rk2nt4` | — |
| Edits | `h5a9qe` | `215lgg` | — |
| Enrichment | `x95xc1` | `wevehv` | — · 47/4/1 |
| Researcher | `cyoxfo` | `tukxqx` | — |
| Export | `8jpwt9` | `hagopc` | — |
| Database | `nt1exh` | `snzsv1` | — |
| Resources | `k8war7` | `e8yx4v` | 100/38/2 · 101/33/2 |
| Categories | `mq9lr5` | `q6ysou` | — |
| Subcategories | `z7r0wb` | `bku4cq` | — |
| Sub-subcategories | `md8jo7` | `47hdxr` | — |
| Users | `3lkjhe` | `2s9lri` | — |
| GitHub | `6bogkh` | `ivsgj3` | — |
| Digests | `dgpmf5` | `lkczns` | — |
| Link Health | `8jejqk` | `5i89ev` | — |
| Audit | `3mj6tb` | `0tqj6z` | 73/9/1 · 74/4/1 |
| Research | `0fa6hg` | `6xuj6m` | 113/54/0 · 114/49/0 |
| Journeys | `jp5o5o` | `jg48ut` | — |

Per-tab control census (second admin identity `__qa_test_568_admin2_…`,
tester `parity-admin-census`), scoped to the active tab panel. Tuple =
`button` total/visible · `a[href]` total/visible · `[role=button]` ·
`input` total/visible. The 375 pass reached every canonical trigger by its
`data-testid` (the strip is horizontally clipped at that width) and each
folded panel via parent → nested trigger.

| Tab | 1440 census | 375 census | Read-only interaction at 1440 → outcome |
|---|---|---|---|
| Overview | 1/1 · 0/0 · 4 · 0/0 | 1/1 · 0/0 · 4 · 0/0 | Resources stat card → navigated; Back → `#overview` |
| Approvals | 1/1 · 0/0 · 0 · 0/0 | same | empty queue; only “Check again” (not clicked) — approval flow exercised in §2 |
| Edits | 1/1 · 0/0 · 0 · 0/0 | same | empty queue; no control besides refresh |
| Enrichment | 28/28 · 0/0 · 0 · 1/1 | same | Filter combobox opened; Escape closed, tab unchanged |
| Researcher | 7/7 · 0/0 · 0 · 3/3 | same | Job History opened; no job launched |
| Export | 6/6 · 0/0 · 0 · 0/0 | same | inventoried; no export triggered (all controls are actions) |
| Database | 5/5 · 0/0 · 0 · 0/0 | same | inventoried; no disclosure present, no maintenance action |
| Resources | 82/82 · 29/29 · 0 · 2/2 | same | search `ffmpeg` → 25 rows → cleared |
| Categories | 19/19 · 0/0 · 0 · 1/1 | same | search `Encoding` → 1 → cleared |
| Subcategories | 23/23 · 4/4 · 0 · 2/2 | 23/23 · 4/4 · 0 · 2/2 (settled; `tc7meb`) | search `Codecs` → 6 → cleared (375 re-run: 10 rows → 6 → 10) |
| Sub-subcategories (folded in Subcategories) | 23/23 · 4/4 · 0 · 1/1 | 22/22 · 4/4 · 0 · 1/1 (settled; `kiuycp`) | nested panel opened, search/table/pagination rendered |

The 375 Subcategories row was first captured while its table was still
loading (2 buttons). It was re-run with a third disposable admin
(`__qa_test_568_admin3_579f8`, tester `parity-admin-subcats-375`) with an
explicit settle gate (no skeleton, row count stable across two reads 2 s
apart, no in-flight `/api` request for 1 s): 92 groupings, 10 rows on page 1,
`content-subcategories` census 23/23 · 4/4 · 0 · 2/2 — identical to 1440;
nested `subsubcategory-manager` 27 groupings, 22/22 · 4/4 · 0 · 1/1 (one
button fewer than the 1440 read, a pagination-control difference at 3 pages).
No control was DOM-hidden at 375; the strip and table are horizontally
clipped, not collapsed. Dashboard `t1gedu`. 0 responses ≥ 400, 0 console
errors, 0 page errors. Sign-in for that run used a backend-minted
`sign_in_tokens` ticket: the tester's own tokens were rejected
(`ticket_invalid_code`) because they were issued against a different Clerk
instance than the app's publishable key.
| Users | 30/30 · 1/1 · 0 · 1/1 | same | search `__qa_test_568` → own row listed → cleared; no role edit |
| GitHub | 4/4 · 0/0 · 0 · 1/1 | same | inventoried; no sync action |
| Digests (folded in GitHub) | 1/1 · 0/0 · 0 · 0/0 | same | opened via `tab-github` → `tab-digests`; transport Available, queue 0 |
| Link Health | 2/2 · 0/0 · 0 · 0/0 | same | inventoried; no checker action |
| Audit | 55/55 · 0/0 · 0 · 1/1 | same | search input cleared; earlier pass opened a row detail dialog + Escape |
| Research | 95/95 · 45/45 · 0 · 0/0 | same | read-only; no approve/reject of discoveries |
| Journeys (folded in Research) | 6/6 · 0/0 · 0 · 0/0 | same | first journey Steps opened; Escape closed |

Census screenshots: `3zve31` (dashboard), `q8nqeu`, `fyt3l8`, `seta17`,
`tm2bgy`, `a0levv`, `xwj1qn`, `aknb0w`, `uwhme7`, `n7ecre`, `y1bqbx`
(1440); `kib5a5` (375 Digests). Per-tab 375 screenshots are the ones in
the table above from the first admin pass.

Monitoring across all admin passes: **0 unexpected error responses**
(no response ≥ 400 at all while signed in as admin) and **0 console errors**.
Journeys, Digests and Sub-subcategories are folded panels nested under their
parent tab by design (see the folded-tab memory note); they activate correctly.
Mobile drawer on `/admin` and `/`: opens, one visible copy, Escape restores
focus to the trigger (`im0g22`, `i9vxqv`). Header search at 375 on `/admin`:
opens (`17zd4d`), Escape restores focus to the trigger (`cencfq`).

## 2. Submit → approve → public → net-zero

Baseline (anonymous, before any write): home stat **1,816**, sidebar
“1,816 indexed · live”, kind counts tools 23 · libraries 61 · standards 47 ·
events 18 · protocols 11 · other 1656 (= 1816), Encoding & Codecs **333**
(14 pages), Codecs **23**; DB `approved = 1816`, `0` rows matching
`__qa_test_` (`1f7sy2`, `6tvkiz`, `bveexp`, `zesa4d`).

1. Visitor `__qa_test_568_visitor_…@example.com` signed in and submitted
   `__qa_test_ 2026-09-15T05:23:49.532Z` (url
   `https://example.com/__qa_test_568_9hsZx7`, Encoding & Codecs → Codecs)
   via `/submit` → **201**, id **188380**, status `pending`
   (`bgda6s`, `yh190d`, `xu32vt`). Anonymous `GET /api/resources/188380` →
   404 (expected for a pending resource).
2. Admin approved it in Approvals through the UI at 1440 (`0uo8dn`) and 375
   (`q93f7b`), confirmation dialog `qz94jv`, after-state `hgrtf8`;
   `POST …/approve` → 200; DB status `approved`, `approved_at` set.
3. Public visibility: `/resource/188380` renders (`lwoqac` 1440, `5eqxfm`
   375); category count **334** (`5a08dd`); Codecs **24** with the fixture
   listed (`qixiqt`); `/search` finds it (`t043th`); header search finds it
   (`8xhho0`, `c91e8y`); home stat **1,817** and the fixture is first in the
   recently-indexed rail (`ywevmr`).
4. `DELETE /api/admin/resources/188380` → 200 (`z5ps3c`). Fresh anonymous
   home: **1,816**, kind counts back to baseline, recent rail first item back
   to `srtdroid` (`wsvk9r`).
5. DB after teardown: `approved = 1816`, `0` `__qa_test_` resources,
   `resource_edits` for 188380 = 0, `resource_audit_log` rows for 188380 = 0
   (the three created/approved/deleted trail rows were purged as part of the
   net-zero sweep), `0` `__qa_test_` users.

Retracted finding: the tester first reported the fixture “absent from
`/category/encoding-codecs` pages 1 and 14”. That was my hint (“newest first”)
being wrong — the category listing is grouped by subcategory, alphabetical
within group, so Codecs items land on pages 5–6 (verified through
`/api/awesome-list/listing`). Not a defect.

## 3. Keyboard-only visitor pass at 1440

Tab order from a fresh load of `/`: skip link → header-brand → Open search →
Browse → Submit → About → Docs → Account · Visitor → nav-home → taxonomy
tree rows → More disclosure → main content → footer.

| Step | Result | Evidence |
|---|---|---|
| Focus indicator | Real-Tab focus on Open search: computed `outline 2px solid rgb(255,61,82)`, ring visible. Account · Visitor and nav-home showed a visible red ring in pixels while `getComputedStyle` read `0px` — that is the outline transition mid-value (see *Verifying CSS states* memory); pixels are authoritative. | `i7tney`, `u3dt1z`, `h5e86w` |
| Search palette | Tab → Open search → Enter; type `ffmpeg`, wait for results, ArrowDown ×2 → `search-result-2` (`ffmpeg-static`); Escape → focus back on Open search. | `i7tney` |
| Tree → subcategory | Enter on `toggle-cat-encoding-codecs` expands; Tab ×4 → `sub-codecs`; Enter → `/subcategory/codecs`. | `e0j6ip` |
| Card → detail → tag | Enter on `link-resource-title-186371` → `/resource/186371`; from `/resource/185214` Tab to `#multimedia framework` → Enter → `/tag/multimedia-framework` (2 resources). | `10kpgv`, `bjxqg4`, `2ik85w` |
| Account menu | Enter opens, first item focused; ArrowDown → Theme Settings; ArrowUp → Sign in; Escape → focus on trigger. (A first attempt that pressed ArrowDown before Radix's focus frame settled did not move — timing, retracted.) | `19rimy`, `t530ah`, `axxhkz` |
| More disclosure → About → Terms | Opened by keyboard; About reached and activated; footer Terms → `/terms`. | `2lodjq`, `uudh5r`, `ujaw4h` |
| Sign-in | Account menu → Sign in → `/sign-in?redirect_url=%2Fterms`. Card is ordinary light DOM (no iframe/shadow/inert); focusable order: breadcrumb Home → card logo → Apple → GitHub → Google → X → email → … → Continue → Sign up → footer. (The first attempt's “220 Tabs never reached the card” was a traversal-counting error, retracted.) | `b7dvrt`, `fz7dqs`, `6sr84w` |
| Guest Favorite | On `/subcategory/codecs`, Enter on the first `button-favorite` shows the non-modal toast “Sign in to favorite” (Sign in / Dismiss); Escape dismisses and focus stays on the button. Toast is the implemented pattern — no dialog trap expected. | `3at2ct`, `j47bdg` |
| Route sweep | With listeners installed first: `/`, `/subcategory/codecs`, `/resource/185214`, `/tag/multimedia-framework`, `/search?q=ffmpeg`, `/about`, `/terms`, `/sign-in` → **0** unexpected error responses (see metric definition in §5), **0** console errors. | `xh0pt2` |

Observations (not defects, handed to the orchestrator as notes):

- The consent banner is the 36th Tab stop on a fresh load (it sits after the
  header and sidebar in DOM order). Keyboard users can reach it; moving it
  earlier is a shared-component decision.
- After an SPA navigation focus rests on `body` (or on the still-mounted
  sidebar link that was activated). There is no route focus manager; adding
  one is a shared-layout change outside this task's boundary.
- `<main>` is intentionally `outline: none` (skip-link target, not a control).

## 4. Mobile flow at 375

Every visitor screen at 375 used the drawer (`mobile-drawer-trigger`) for
navigation and the header search trigger; both open as Radix dialogs and
Escape restores focus to their trigger on every screen tested (see §5 tables).

## 5. Per-screen visitor control census (1440 and 375)

Tuple = `button` / `a[href]` / `[role=button]` / `input` in the live DOM. All
`target=_blank` / off-origin links were inventoried and **not activated**;
no auth submission, no catalog write. Repeated per-card controls were
exercised once per screen (first card).

| Screen | 1440 | 375 | Exercised (outcome) |
|---|---|---|---|
| `/` | 19/151/0/0 | 9/134/0/0 | Open search (opened, Esc → trigger); drawer (opened, Esc → trigger); consent Decline (dismissed). Account menu covered in §3. |
| `/category/encoding-codecs` | 137/212/0/3 | 124/178/0/3 | Grid/List/Compact (toggled); Next (→ `?page=2`, 2 of 14, back); first-card Favorite (guest toast), Bookmark (toggled on, then restored), Suggest an edit (Sign in required dialog, Esc closed), More tags (expanded). Sort / Filters / page-jump exercised on `/search` and in the earlier native visitor run. |
| `/subcategory/codecs` | 120/158/0/2 | 107/124/0/1 visible | Inventoried; first-card behaviour identical to category (verified there and in §3 Favorite step). |
| `/resource/185214` | 22/76/0/0 | 9/42/0/0 | Tag chips (→ `/tag/…`), category badge, Back; Favorite (guest toast); Bookmark (on → restored off); Share (desktop “Link copied”; mobile hands off to Web Share, no toast by design); Suggest edit (guest toast); drawer + search at 375 (Esc → trigger). |
| `/tag/multimedia-framework` | 25/84/0/0 | 12/50/0/0 | Back to Home (→ `/`); first-card More tags / Favorite / Bookmark (restored) / Suggest edit (dialog, Esc); title (→ `/resource/185413`, back); drawer + search at 375. No view toggles exist on the tag route. |
| `/search?q=ffmpeg` | 159/138/0/3 | 146/104/0/2 visible | Input edit + Enter (→ `q=ffmpeg-wasm`, 23); category facet (23 → 15); Sort Name A–Z (`sort=name-asc`); Clear all filters; Next (2 of 9); page-jump `1`; empty state `q=zzqxv__none` (“No resources match…”); Clear search (→ `/search`); mobile Filters sheet (opened, Esc); drawer + search at 375. |
| `/about` | 27/72/0/0 | 14/38/0/0 | FAQ 0 (expanded); Submit CTA (→ `/submit` guest gate “Login required to submit”, form disabled); Terms link; drawer + search at 375. |
| `/terms` | 17/63/0/0 | 4/29/0/0 | Cookie settings (re-opens consent banner; Esc closes without changing consent); Privacy (→ `/privacy`); Code of Conduct (→ `/code-of-conduct`); Sitemap (→ `/sitemap.xml`); drawer + search at 375. |
| `/sign-in` | 24/64/0/2 | 11/30/0/2 | Email/password synthetic fill + clear; Sign up (→ `/sign-up`, back to `/sign-in`); providers and Continue not activated; drawer + search at 375. |


### 5a. Exhaustive per-instance card-control replay (tester `parity-card-instances`)

Requested by the task owner after the family-level census: every repeated
per-card control on every listing screen, every card, both widths. Anonymous
visitor, fresh context per width, listeners installed before navigation,
consent declined, external `button-visit-*` / `button-external-*` never
activated, every bookmark toggled back off (final reload asserted
`aria-pressed="true"` count = 0 on every screen/width). Executions were kept
to one control family × ≤ 4 cards (navigation: one card) per step because the
tester's browser worker has a 45 s ceiling per execution; the first attempt
that looped all 24 cards in one execution crashed the worker three times.

Per card and in this order: `button-more-tags-<id>` (expand; N/A when the
card has ≤ 3 tags), `button-favorite` (guest toast "Sign in to favorite" →
Escape), `button-bookmark` (`false → true → false`), `button-suggest-edit-<id>`
(dialog → Escape, detached), every visible `tag-pill-<id>-*` (listing pages:
filter chip → `?tags=<tag>` → back to the grid with the first card visible;
`/tag` route: navigates to `/tag/<slug>` or stays when it is the current tag),
`link-resource-title-<id>` (→ `/resource/<id>`, non-empty `h1` → back).

| Screen | Width | Cards | title | favorite | bookmark cycles | suggest-edit | more-tags | tag pills | other | Final bookmarks | Unexpected ≥400 / console errors | Screenshot |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|---:|---|---|
| `/category/encoding-codecs` p.1 | 1440 | 24 | 24 | 24 | 24 | 24 | 19 (5 N/A) | 57 | — | 0 | 0 / 0 | `2fi8xs` |
| `/category/encoding-codecs` p.1 | 375 | 24 | 24 | 24 | 24 | 24 | 19 (5 N/A) | 57 | — | 0 | 0 / 0 | `22g1p4`, `oipavr` |
| `/subcategory/codecs` | 1440 | 23 | 23 | 23 | 23 | 23 | 8 (15 N/A) | 24 | — | 0 | 0 / 0 | `kexvux` |
| `/subcategory/codecs` | 375 | 23 | 23 | 23 | 23 | 23 | 8 (15 N/A) | 24 | — | 0 | 0 / 0 | `yaqvbr` |
| `/tag/multimedia-framework` | 1440 | 2 | 2 | 2 | 2 | 2 | 2 | 6 | Back to Home → `/` → back | 0 | 0 / 0 | `0qus61` |
| `/tag/multimedia-framework` | 375 | 2 | 2 | 2 | 2 | 2 | 2 | 6 | Back to Home | 0 | 0 / 0 | `hbttob` |
| `/search?q=ffmpeg` p.1 (1–24 of 198) | 1440 | 24 | 24 | 24 | 24 | 24 | 0 (N/A) | 0 (none rendered) | query preserved | 0 | 0 / 0 | `qxxvg2` |
| `/search?q=ffmpeg` p.1 | 375 | 24 | 24 | 24 | 24 | 24 | 0 (N/A) | 0 | query preserved | 0 | 0 / 0 | `cc3at2` |
| `/` recently-indexed rail | 1440 | 5 (`link-home-recent-*`, title-only items) | 5 | — | — | — | — | — | `link-submit-resource` → `/submit` → back; no rail arrows/"view all" rendered | 0 | 0 / 0 | `71aumx` |
| `/` recently-indexed rail | 375 | 5 | 5 | — | — | — | — | — | same | 0 | 0 / 0 | `4f9tum` |

Per-card ids (all rows passed every control they rendered): category
184847 186623 185201 186494 185062 186357 185364 184768 185430 184909 185037
186674 186487 184956 185297 184769 186258 185214 185450 185101 185217 186108
186240 185016; subcategory 186371 186489 186677 186520 186488 186558 186377
185610 186157 185991 186374 186210 185985 185757 185990 185989 186304 186485
186486 186565 185817 185984 186566; tag 185413 185214; search 185214 184882
184884 184819 185344 185343 184883 184802 186334 185345 186567 186570 186459
185450 185248 186414 184924 186482 185298 185101 186677 185767 186113 186063;
home 188015 188014 188013 188012 188011. The tester's per-card tables are
reproduced in its run transcripts; the totals here are copied from them.

Totals, summed from the table above (title + favorite + bookmark cycle +
suggest-edit + more-tags + tag pills + other, per width): category 172,
subcategory 124, tag 17 (16 + Back to Home), search 96, home rail 6 =
**415 distinct control instances per width, 830 across both widths**
(bookmark counted once per cycle; 488 clicks per width / 976 in total
counting both bookmark clicks), against the 636 instances in the abandoned
scripted ledger. **0 dead
controls, 0 unexpected error responses, 0 console errors, 0 page errors** in
every run; only the Clerk development-key warning.

Retracted during this replay (not defects): (1) the tester flagged a listing
tag pill going to `?tags=AMD` instead of `/tag/amd` — listing-page pills are
filter chips by design (`aria-label="Filter by tag …"`); detail-page chips
navigate. (2) Two `h1` reads returned the page-level heading ("Search",
"Awesome Video Resources") for 185214/188015 — a read taken before the detail
rendered; `/resource/188015` renders `<h1>srtdroid</h1>` (curl + screenshot),
and 185214 read "FFmpeg" in the tag run. (3) "Sticky header clips upper card
content" at 375 on search — measured: header 0–56 px, mid-list card after
`scrollIntoView` at 262–630 px, its bookmark clickable and cycled; preceding
content scrolls under the header as designed (`ondkkt`). (4) Intermittent
near-black intermediate captures while the DOM stayed interactive — the
tester's capture pipeline on the dark theme; final captures are clear.

Infrastructure note: the app port went down once mid-run (connection
refused after a tester worker reset); the `Start application` workflow was
restarted and the replay resumed from the last confirmed card. Never counted
as an app failure.

Roll-up (family-level census): 18 screen/width combinations, 79 distinct control families exercised,
**0** unexpected error responses and **0** console errors for the whole census
session.

Metric definition — “unexpected error response”: any response with status
≥ 400 **except** the two the app produces by design for an anonymous
visitor: `401` from the signed-in-only user endpoints (`/api/auth/user`,
`/api/bookmarks`, `/api/favorites`, `/api/notifications/*`) and `404` for a
resource that is not yet approved (the pending fixture in §2). Those expected
statuses occurred; nothing else ≥ 400 did. Console “errors” = `console.error`
and uncaught page errors; warnings are listed separately.
Dead controls: none. The one “no-op” the tester reported — the sign-in
Show/Hide password toggle — was a click on Clerk's visually hidden password
node: the card renders identifier + Continue first and shows the password
step after an identifier is entered; the earlier
[password follow-up](password-followup.md) verified Show → Hide → clear at
both widths on the real password step.

Screens: desktop `mrlasp` `ll5dpp` `4wfmrz` `r7128o` `kgnx3l` `sy4dei`
`g7uagp` `55cd5y` `lt1w9u` `y1wsgv`; mobile `ue83ip` `g2cirw` `i8wrx1`
`1lpy5a` `ley60v` `03hxo1` `y3q1hs` `6f8l47` `cnihap` `p8s64f`.

Console warnings seen (no errors): Clerk development-key notice; Chrome's
“input should have an autocomplete attribute” for Clerk's email/password
inputs (Clerk-rendered markup, not app code).

## 6. Teardown

Order matters: live tester sessions re-provision their local row via JIT on
the next request after a DB-only delete, and a still-valid Clerk session JWT
(~60 s) keeps doing so briefly even after the Clerk user is deleted. Final
sequence: delete every `__qa_test_568` Clerk user (`DELETE /v1/users/:id` →
200; Clerk query → empty), wait for token expiry, then delete local rows
(owned rows removed, `resource_audit_log.performed_by` nulled, `users` rows
deleted), then purge the fixture's three audit-trail rows. Identities torn
down: first admin, visitor, second admin (`admin2_knycf9`) and a duplicate
provisioning attempt (`admin2_fbpdog`), plus three leftover Clerk users from
earlier interrupted attempts under the same task prefix. Final state: `0`
`__qa_test_` users (local and Clerk), `0` `__qa_test_` resources,
`approved = 1816`, no audit/edit rows for 188380. No other worker's identity
was touched.

Third admin (`admin3_579f8`, the settled 375 Subcategories re-run): Clerk
user deleted first (200, email query empty), 90 s wait, local `users` row
deleted (no owned rows), `__qa_test_` local count 0. While checking Clerk,
seven stale `__qa_test_` Clerk users from earlier runs with no local row were
purged (`__qa_test_parity_*` from 2026-09-13 and older, `__qa_test_ga4_*`
from 2026-09-02, `__qa_test_clerk_*` from 2026-08-12). Three
`__qa_test_parity_*` Clerk users created 2026-09-14/15 were left in place:
they belong to the parity harness of a concurrently running task and are not
this task's to delete (they have no local rows).

## 7. Not done / gaps

- (Closed later the same day) Full `test:e2e` initially could not run: the
  WebKit build needed ICU 74 and Firefox/WebKit were not installed. After the
  runtime fix the full suite ran on all five projects — 663 passed, 3 load
  flakes (pass solo), 32 declared WebKit-over-http Clerk skips; see
  `../test-e2e/README.md`.
- Per-step PNGs at `docs/parity/evidence/clickthrough/<flow>/<nn>-<step>-<width>.png`
  were not produced for this run — the native tester cannot export images;
  evidence is by artifact ID above. Earlier harness captures under
  `local/`, `keyboard-desktop-final/`, `production/` remain as file evidence.
- (Closed) The per-instance card-control replay was run after the
  family-level census — see §5a: 830 instances over both widths, 0 dead.
- `local/admin/11-users-1440.png` was removed from the evidence set: the
  Users tab frame showed a real account holder's name next to the masked
  email. The admin PNG set is now 20 frames; the Users tab is evidenced by
  its native artifact IDs (`3lkjhe`, `2s9lri`) whose census row was taken
  on the disposable identity's own row. The frame still exists in this
  branch's commit history and on the platform's automatic `gitsafe-backup`
  ref (not on the GitHub `origin` remote) — the history rewrite is the
  orchestrator's before publishing; see `CLICKTHROUGH.md` Declared gaps 3.
