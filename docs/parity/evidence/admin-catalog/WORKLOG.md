# Admin catalog implementation and verification

## Delivered boundary

Owned components: ResourceManager, GenericCrudManager, UsersTab and the three
taxonomy configs. CategoryManager/SubcategoryManager/SubSubcategoryManager remain
thin wrappers with their public contracts unchanged. Styles are imported from
the owned components in `admin-catalog-resources.css` and
`admin-catalog-taxonomy.css`, rather than editing a shared admin stylesheet.
No shell, queues, operations, backend, frozen reference, aggregate parity
inventory/report, or ADMIN-GUIDE changes were made.

- Resources retain server-side search/filtering, pagination, bulk actions and
  existing CRUD. Added title/category/kind/status/featured/updated columns.
- Edit has six explicit kinds plus clearing the stored override, an inferred
  hint, and a Radix featured switch. The new controls save immediately through
  the existing PATCH endpoints; the UI says so. Both controls and general Save
  are mutually disabled while a write is pending. General PUT does not resend
  PATCH-owned fields. Optimistic snapshots roll back on failure; errors remain
  inline, and settlement invalidates list, detail, counts, navigation and audit.
- Raw admin/PATCH rows do not contain `resolvedKind`. Client rows use the shared
  resolver with safe metadata handling. Current custom YAML mappings are empty.
  The registered `admin-catalog-kind-mappings` gate blocks nonempty mappings
  until server-authoritative admin resolution is integrated. No N+1 fetching.
- Categories show Icon/Name/Slug/Resources/Subcategories, with child counts from
  the existing lightweight navigation query. Subcategories and sub-subcategories
  follow the Name/Slug/Parent/Resources pattern. Search and delete guards remain.
- Following the browser finding, taxonomy create/update/delete now invalidate
  `awesome-list-nav` and `awesome-list-data`, so the sidebar refetches.
- All literal/template test IDs were retained (`gates/testids.json`); the two
  required IDs and two inline error IDs were added.

## Verification results

| Check | Result / evidence |
|---|---|
| TypeScript | PASS, `gates/check-final.log` |
| Build | PASS, `gates/build.log` |
| Bundle budget | PASS on built catalog changes, `gates/budget-final.log` |
| CSS lint | PASS, `gates/css-final.log` |
| Unit suite | 15 files / 300 tests PASS, `gates/unit.log` |
| Dead components | PASS, `gates/dead-components-final.log` |
| Response contracts | 19 checks, zero real mismatches, `gates/contracts.log` |
| Kind mapping constraint | PASS, `gates/kind-mappings.log` |
| Responsive audit | 52 checks, zero failures, `gates/responsive.log` |
| Repository lint | FAIL; 5,601 errors / 21 warnings in captured run. ResourceManager baseline measured using HEAD through eslint stdin; final implementation reduced its findings from 74 to 68. Not a repository-wide lint pass. |
| Legacy admin-operations | NOT GREEN: 16 passed, three failed, 29 not run; stopped after repeated unrelated missing/hidden old shell/export expectations. No authenticated fixture in this suite. `gates/admin-operations.log`. |
| Four-width pixel targets | FAIL, measured without masking/cropping; see HANDOFF.md. |

The build/budget predate the final label-association and cache-invalidation fixes;
TypeScript and the responsive audit include those fixes. No build/budget regression
is asserted beyond the measured revision.

### Real functional evidence

`final-pass/functional-axe.json` records:

- all six kind PATCH values and null clearing returning 200;
- featured true and false PATCHes returning 200;
- actual UI use of `admin-resource-kind-select` and
  `admin-resource-featured-toggle`, producing successful requests;
- matching kind/featured audit entries through the Audit API;
- unique category creation, auto slug, rename, deletion and audit entries;
- nonempty category delete disabled in the UI and rejected with 400 by the API.

The tested existing resource values were restored and verified
(`verify-ui-resource.json`). The disposable category was deleted. Completed
identities were removed, and the verifier separately removed only its own
timed-out identities (`cleanup-owned-identities.json`); no broad sweep was used.
Audit history intentionally retains the real verification operations.

### Accessibility and follow-up fixes

The 16 axe states cover Resources, Categories, Subcategories and Sub-subcategories
at 375 and 1440, closed and with a dialog open. Four closed surfaces and all
taxonomy dialogs had zero serious/critical findings. Resource edit initially
reported unnamed category/status/subcategory/sub-subcategory select triggers.
Those four triggers, and their create equivalents, now have IDs matching the
existing labels. A source assertion confirmed all eight associations; TypeScript
passed. **The retained axe JSON is pre-fix and is not a post-fix zero-violation
claim.** Final integrated accessibility verification remains open.

The same pass identified the stale taxonomy navigation cache and missing-category
create toast. Both were fixed afterwards with cache invalidation and an inline
form error respectively. No second broad functional run was launched.

## Evidence limitations

### Completion validation follow-up

The first automatic completion run identified an ECONNRESET in the unrelated
taxonomy listing parity fetch, and one owned DS input-hook failure: the new
native kind select did not consume the existing canonical `.select` class.
It now consumes that class (plus its scoped sizing rules); the gate was not
relaxed and no exclusion was added.

- Historical pre-change screenshots are retained in the earlier committed parity
  baseline; a fresh local pre-change capture was not taken before implementation.
  `pre-final-taxonomy` is an intermediate implementation capture, not pristine
  baseline evidence.
- The functional pass did not establish the home FEATURED stat/Curated layout
  after a toggle, a public-detail one-refetch assertion, Audit-tab DOM visibility,
  or real transport-failure rollback. Cache wiring was reviewed, not a substitute
  for those browser assertions.
- Category resource counts match the public navigation count (80 in the checked
  category); the delete guard reports 86 across all statuses. The stronger guard
  is preserved; counts were not relaxed to make deletion possible.
- Full-page closure and missing verification are explicitly handed to the
  already-planned integration/final-regression work. This is not a declaration
  that all original acceptance gates are green.