# Task 565 public retained-baseline comparison — 2026-09-13

This is a sanitized summary of the fresh candidate comparison. It contains no
credentials, cookies, raw identity responses, or API bodies.

- **Baseline:** `tests/parity/production-baseline/2026-09-12`, captured from
  `https://awesome.video`.
- **Candidate:** loopback `http://127.0.0.1:5000`.
- **Compared:** 2026-09-13T21:45:07.861Z with Chromium 1223 and axe-core
  4.13.0.
- **Scope:** `/`, `/about`, `/category/encoding-codecs`, and
  `/resource/185020`; the existing comparator's retained four-width/full-page
  behavior was deliberately used.
- **Detailed ephemeral output:** `/tmp/validation/task565-public-compare/`
  (`compare-report.md`, `compare-report.json`, candidate artifacts and 16
  visual-only strips).

## Result

Capture completed without route/API capture failures, missing comparison units,
or throttling. All four routes returned 200 with the same redirect chains.
There were zero serious/critical axe rules/nodes at 375 and 1440 for every
route. This is **not** a no-regression pass: it reports **17 tracked deltas**
across all four routes and eight of twelve API endpoints.

| Route | Result |
|---|---|
| `/` | Title and visible-test-id deltas: +113 / -27 |
| `/about` | H1 and visible-test-id deltas: +14 / -199 |
| `/category/encoding-codecs` | Visible-test-id deltas: +15 / -31 |
| `/resource/185020` | Visible-test-id deltas: +9 / -205 |

## Visible test-id deltas requiring disposition

“Removed” here means absent from the candidate's visible test-id set at the
named viewport, not that source code was deleted.

- Home is missing `button-browse-recommendations` and
  `link-recommendations-heading` at every captured width. The six `rail-*`
  controls are absent from the visible set at 768 and above; at 1024/1440,
  `nav-advanced`, `nav-learning-journeys`, `nav-submit-resource`, and
  `nav-theme` are also absent. At 1440, `mobile-drawer-trigger` is absent as a
  visibility delta. The 1024/1440 taxonomy/subcategory removals need
  data/state proof before any selector-removal conclusion.
- About has no visible-test-id removal at 375, then the same six `rail-*`
  removals at 768 and broad taxonomy/accordion/subcategory removals at
  1024/1440. The new FAQ, breadcrumb, and footer IDs are additions; the H1
  changes from `About` to `A field journal for video engineers`.
- Encoding & Codecs exchanges local resource/page IDs
  (`185016`/page 14) for retained production IDs (`189535`/page 25), alongside
  the shared rail/navigation/taxonomy visibility deltas. Those resource IDs
  are data-qualified, not selector-removal proof.
- Resource detail exchanges five retained related-resource IDs
  (`189664`, `189808`, `189809`, `190062`, `190065`) for five local related
  IDs (`186418`, `186419`, `186458`, `186495`, `186610`). Its rail, breadcrumb
  ellipsis, and taxonomy visibility deltas must remain separately
  dispositioned.

The report also confirms production/local catalog divergence: resources
3824→1817, subcategories 99→92, third-level categories 32→27, tags
1541→1535, and Encoding & Codecs total 579→333. The candidate adds `kind`,
`resolvedKind`, and some `metadata.featured` key paths on resource-bearing
endpoints. These facts explain data-specific IDs/counts but do not waive
shell/control visibility differences.

## Separate blocked checks

- The initial targeted admin candidate run did not navigate or capture a route:
  Playwright looked for its default Chromium headless shell 1228, which is not
  installed. `capture-admin-candidate.mjs` now honors the explicit
  `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` environment variable; rerun it with
  the installed Chromium 1223 executable. This is a local launch
  configuration failure, not an admin contract result.
- The palette close run failed before a pixel capture while the disposable
  admin setup waited 60 seconds for `/sign-in` `domcontentloaded`. It is an
  infrastructure timeout, not a new palette pixel measurement.
- The authorized performance result is **54** with **0 blocked requests**,
  below the required **82**. It remains a FAIL and is not waived by this
  comparison.

## Per-delta disposition register (source review; no rerun)

This is the closure record for **each of the comparator's 17 tracked
dimensions**, rather than an aggregate waiver. “Data-qualified” means that the
production and candidate captures demonstrably used different catalog snapshots
(3,824 versus 1,817 resources), so the old value/ID is not a valid candidate
oracle. It does **not** excuse a missing control or a dropped populated field.

| # | Comparator unit | Precise disposition | Canonical source proof / next meaningful exercise | Open item |
|---:|---|---|---|---|
| 1 | `/` title | **Data-qualified; expected dynamic value.** | `Home.tsx:770–773` calls `homeSeoTitle(nav.totalResources)`. After nav/home reaches a terminal state, compare the title number with that same approved-catalog snapshot; do not require historical `3824+`. | None after snapshot-consistent assertion. |
| 2 | `/` visible testids | **Mixed: canonical additions, data-derived IDs, state-gated controls.** | `HomePresentation.tsx:159–214,301–464,619` renders the new index/stat/kind/resource/category controls. `Home.tsx:721–730` renders `AccountFeatures` only for `?context=account` or `?account=1`; `Home.tsx:394–431` retains both reported missing recommendation selectors there. Exercise anonymous `/?context=account` for heading/browse, authenticated account context for panel/onboarding. | Historic default-root recommendation placement is intentionally absent; reopen only if that product requirement remains. |
| 3 | `/about` h1 | **Intentional canonical editorial change, source-proven.** | `About.tsx:72–81` literally renders “A field journal for video engineers.” Exercise public `/about` after normal content render. | None. |
| 4 | `/about` visible testids | **Canonical additions plus responsive/disclosure state; not a wholesale removal conclusion.** | FAQ is rendered in `About.tsx`; `PageBreadcrumb.tsx:175–190` renders breadcrumb/home/current selectors; `AppFooter.tsx:34` renders the canonical footer. Rail/tree IDs require row 5's current sidebar state. | Verify any legacy rail/tree requirement in its actual state first. |
| 5 | `/category/encoding-codecs` visible testids | **Data-qualified resource/page IDs; shell IDs state-qualified.** Candidate `185016`/page 14 replace production `189535`/page 25 because current total is 333, not 579. | Exercise listing after response settles and assert cards/page to that response. For sidebar descendants, load nav, open `details.av-sidebar-more-navigation`, then `toggle-cat-${slug}` and `expand-sub-${slug}`. `AppSidebar.tsx:358,367,432,470,485,523,879–937` contains the relevant accordion/row/toggle/sub/subsub/nav selectors. | Any selector still absent after that interaction remains open. |
| 6 | `/resource/185020` visible testids | **Related-resource IDs data-qualified; breadcrumb ellipsis separately unresolved below.** | `ResourceDetail.tsx:1020–1039` renders related IDs from the related response. Exercise after it settles and compare to current result set. | Resolve breadcrumb behavior below; do not waive it with data drift. |
| 7 | `/api/resources?limit=24` key paths | **Intentional additive public contract.** | `server/lib/publicResource.ts:29–35,71–85` is the public serialization choke point and adds stored `kind` plus `resolvedKind`; it does not remove public user fields. Exercise 24 current approved rows. | None. |
| 8 | `/api/resources?limit=24` counts | **Data-qualified.** 3,824/160 pages versus 1,817/76 and first/last IDs are catalog-snapshot facts. | Compare total, `pagination.total`, total pages, and IDs to one current query/snapshot. | None. |
| 9 | `/api/resources/185020` key paths | **Intentional additive public contract.** | Same `stripInternalResourceFields` proof as row 7; exercise detail API and rendered kind state. | None. |
| 10 | `/api/subcategories` item count | **Data-qualified.** 99 versus 92 is a taxonomy snapshot change with unchanged status and shape. | Compare endpoint and loaded sidebar/category tree to same current snapshot. | None. |
| 11 | `/api/sub-subcategories` item count | **Data-qualified.** 32 versus 27 is a taxonomy snapshot change with unchanged status and shape. | Same snapshot discipline; expand a parent before asserting visibility. | None. |
| 12 | `/api/tags` item count | **Data-qualified.** 1,541 versus 1,535 tag records. | Compare `tags[]` length to the current response. | None. |
| 13 | `/api/tags` `total` count | **Data-qualified.** Reported `total` follows the same 1,541 versus 1,535 snapshot. | Assert `total === tags.length` for current response, not production total. | None. |
| 14 | Encoding & Codecs listing key paths | **Intentional additive public contract.** | Listing rows use `stripInternalResourceFields` (`publicResource.ts:71–85`), producing `kind` and `resolvedKind`. | None. |
| 15 | Encoding & Codecs listing counts | **Data-qualified.** tags 275→271, total/totalAll 579→333, pages 25→14, general 96→92 follow the divergent catalog. | Assert listing totals, page links, cards against same live listing response. | None. |
| 16 | `/api/journeys/7` key paths | **Intentional additive public contract.** Step count remains 18. | Public journey-step projection attaches kind fields separately, as documented in `publicResource.ts:31–35`; exercise `/journey/7` after 18 current steps load. | None. |
| 17 | `/api/recommendations` key paths | **Closed as an actual selected-resource data-shape difference.** IDs are data-qualified and kind fields intentional; the bounded public-ID/detail match below found no tag-shape mismatch in any of the ten returned recommendations. | `journeys-recommendations.ts:633–640` serializes each embedded resource; `publicResource.ts:44–85` preserves user-facing tags and strips only listed internal keys. The actual recommendation IDs were read again through public detail, not fabricated input. | No current response-path loss. This does not claim an unreturned tagged recommendation was exercised. |

### Breadcrumb ellipsis: functional replacement and selector decision

The production `button-breadcrumb-ellipsis` was a real control: at 768/1024
the baseline announced “Show 1 hidden breadcrumb level.” The canonical current
resource crumb is not that collapsed trail. `resolveCrumbs` in
`PageBreadcrumb.tsx:114–145` resolves `/resource/:id` to one terminal resource
crumb; render then provides **Home** as `link-breadcrumb-home` and the terminal
page as `breadcrumb-mobile-current` (`PageBreadcrumb.tsx:175–190`). Its
functional replacement for this resource route is therefore the short,
fully-specified two-level trail (Home → current resource), not an ellipsis that
reveals an omitted level.

No meaningful compatibility selector can be attached to an unrelated current
element: neither Home nor the disabled current crumb performs “show hidden
breadcrumb level,” and `BreadcrumbEllipsis` in
`components/ui/breadcrumb.tsx:91–105` is only a presentational span.

The approved functional restoration is now implemented shell-side as lazy
`ResourceBreadcrumbAncestorDisclosure`. It shares `ResourceDetail`'s exact
`["/api/resources", resourceId]` React Query key, resolves only real current
category/subcategory/L3 ancestors from the lightweight nav tree, and renders a
real DS `DropdownMenu` trigger with
`data-testid="button-breadcrumb-ellipsis"` only where at least one such link
exists. The menu contains those actual links. The route-only slot itself is
not rendered and does not load the lazy chunk outside 768–1279px, preserving
the canonical Home → current trail at 375 and 1440.

The trigger has a compact visual size to preserve the existing breadcrumb row
and an absolutely positioned 24px pointer-target pseudo-element. This is an
implementation intent verified by the focused real-guest check retained in
`task565-breadcrumb-disclosure-2026-09-13/REPORT.md`: at 768 and 1024 the row
remained 20px and H1 top was unchanged closed/open/Escape, while the computed
pointer target was 24×24px and no horizontal overflow occurred. That focused
check uses no masking; it is not a replacement for a future full pixel matrix.

## Bounded current public-API consistency proof — 2026-09-13T22:13:29Z

No browser, database write, fixture, or mock was used. Successful public
loopback reads were limited to `/api/health`, `/api/awesome-list`,
`/api/resources?limit=24`, `/api/subcategories`, `/api/sub-subcategories`,
`/api/awesome-list/listing?level=category&slug=encoding-codecs`,
`/api/recommendations`, and the ten public `/api/resources/:id` details
identified by that returned recommendation response. This records counts,
public IDs, and field presence only—no titles, URLs, cookies, or response bodies
are retained here.

| Read relationship | Sanitized public count/shape proof | Disposition closed by this read |
|---|---|---|
| Awesome-list tree → resources pagination | The tree's top-level `resources` array contains 1,817 rows and 1,817 unique public IDs; every row reports `status: "approved"`. Its hierarchy has 9 categories, 92 subcategories, and 27 L3 nodes. `/api/resources?limit=24` returns 24 rows with `total: 1817`, `pagination.total: 1817`, `totalPages: 76`, and `hasMore: true`. | Rows 1, 8, 10, and 11 are current-snapshot data differences, not production parity failures. It also closes the catalog-derived portion of row 2. |
| Tree's Encoding & Codecs node → category listing | Recursive references under `encoding-codecs` contain 333 rows / 333 unique IDs. The listing returns 24 first-page rows, `total: 333`, `totalAll: 333`, `totalPages: 14`, `generalCount: 92`, and 271 tags; every returned listing ID exists in both the overall tree and the Encoding & Codecs node. | Rows 5 and 15 are closed for their resource/page/count data portion. The shell selector-state portion of row 5 remains deliberately unwaived. |
| Tag endpoint | `/api/tags` has 1,535 tag entries and its public `total` is 1,535. | Rows 12 and 13 are current-snapshot data differences. |
| Returned recommendations → matching public details | `/api/recommendations` returned 10 public embedded-resource IDs: `188015, 188014, 188012, 188010, 188011, 188009, 188007, 188008, 188321, 187178`. Each ID is in the approved tree and each matching `/api/resources/:id` detail has the same ID. For all 10 pairs, top-level `tags` is absent and `metadata.tags` is absent on **both** sides. Nine pairs have empty metadata; one pair has only `metadata.featured`. | Row 17's reported missing recommendation tag paths are closed as a selected-resource data-shape difference, not a recommendation serializer loss. There is no fake tagged input: the actual returned IDs were used. |

The final relationship is also bounded by a useful negative control: the same
current public awesome-list tree contains 1,047 resources with a non-empty
`metadata.tags` array (of 1,817 total), so tags do exist in the candidate
catalog. The ten resources actually selected by the recommendation endpoint
simply are not among them, and public detail agrees with the recommendation
shape for every selected ID. This supports the source review in row 17
(`stripInternalResourceFields` preserves `metadata.tags`) while avoiding a
claim that an unreturned tagged recommendation was tested.