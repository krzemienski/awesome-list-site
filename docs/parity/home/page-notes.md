# Home index / curated parity notes

## Implementation

- `/` now uses the canonical hero-less home geometry from
  `awesome-list-site-ds/home-layouts.jsx`: index metadata row, five-kind strip,
  four-cell statistics strip, category/subcategory reference grid, sticky
  recently-indexed rail, and contribute card.
- `?layout=curated` and the persisted preference resolved by
  `useHomeLayout()` select the featured-first layout. There is deliberately no
  visible layout switch on the page.
- Home data is read from `GET /api/home`; the kind strip uses the full-set
  `GET /api/resources/kinds/counts` response. Resource cards and recent rows
  use real resource/detail routes (with an external-link fallback for a
  non-database resource).
- The canonical default is intentionally uncluttered. Existing account-only
  Continue Learning, onboarding invitation, and recommendation surfaces remain
  available under `?context=account` (the legacy `?account=1` alias is also
  accepted). Tag and sort deep links continue to work without that context;
  their advanced controls appear when a filter/sort is active or
  `?filters=1` is supplied.

## Explicit parity decisions

- Kind chips use the resolved `kind` field from the public corpus to filter the
  home category grid in place. This avoids handing users to a downstream
  `/categories?kind=` route that does not currently consume that parameter.
  Counts in the strip remain full-set and never change after a chip is clicked.
  The `other` count is retained in accessible text and is not a sixth visual
  chip, matching the canonical five-chip strip.
- Kind scope is intentionally not appended to category/subcategory drilldown
  links yet: those downstream pages do not currently consume `kind`, so adding
  it would silently imply a filter that is ignored. Tag scope is propagated to
  both drilldown levels; kind propagation remains an unresolved downstream
  contract.
- The curated eyebrow uses the current ISO week, and all stat cells use live
  endpoint metrics. There are no placeholder contributor or approval values.
- Public resources expose `metadata.tags` and may omit moderation timestamps;
  home ordering is server-owned by the `/api/home` response. The client only
  renders the supplied five recent and six featured rows.
- The canonical content is rendered before optional account/filter surfaces.
  Account context and tag/sort controls remain available after the index or
  curated content rather than interrupting the default metadata-to-stats flow.
- A bottom utility row now gives every visitor explicit Settings, Account, and
  Filters entry links; account-only panels remain contextual and lazy-loaded.

### Worklog: intentional real-metric deltas

- The index eyebrow says `ENTRIES` and `UPDATED TODAY` to match the canonical
  index contract; the curated eyebrow reports the actual current ISO week.
- Curated’s fourth metric is the endpoint’s real `approvedThisWeek` value, not
  a mock contributor count.
- Kind counts are full-set resolved-kind counts, while selected kind filters
  use each public resource’s resolved kind and leave those strip totals intact.

## Validation / handoff

No browser or workflow was run in this leaf implementation. The owning
integrator should validate the four target widths, persisted layout preference,
kind navigation, tag/sort deep links, and full-page SEO/axe parity after the
provided `useHomeLayout` hook and endpoint are present.
