# Shell sidebar assumptions

Final evidence and unresolved integration differences are recorded in
`docs/parity/evidence/sidebar/RESULTS.md`. The canonical viewport height is
capped by the existing consent-row inset while that row is present, avoiding
short-page footer overlap without changing banner-free geometry. App-only
routes remain in accessible More navigation details pending header integration.

Task #539 adopts the canonical `awesome-list-site-ds` shell geometry for the
application sidebar and drawer. This note is the reason-carrying source for
responsive audit expectations; it deliberately records the differences from
the older shadcn/icon-rail behavior rather than relaxing those checks.

## Geometry contract

| Viewport | Sidebar | Drawer | Rationale |
| --- | --- | --- | --- |
| `>=1025px` | visible, `280px`, sticky below `--header-height` | unavailable | Canonical `.sidebar { width: 280px; top: 60px; height: calc(100vh - 60px) }`. |
| `768–1024px` | visible, `240px`, sticky below the header | available from the header trigger | Canonical tablet handoff: the 240px sidebar remains mounted at exactly `768px`, while the drawer remains available. |
| `<768px` | hidden | `86%` width, `340px` max, left slide | Strict phone boundary: the static sidebar is hidden below `768px` and `.mobile-drawer` takes over. |

The default shell intentionally has no 56px icon rail. The rail tokens remain
available for a separately exposed design variant, but the application
sidebar uses the full category rows by default. This is why the tablet audit
expects a visible 240px sidebar at both `768px` and `1024px` instead of the old
`sidebar-collapsed` rail, while still requiring the drawer trigger at `768px`.
At `767px` and below it expects only the drawer path.

## Row and accessibility contract

Category rows keep the production `data-testid` values and count source. The
category label remains a real link while its sibling chevron is the sole
disclosure button (`aria-expanded` + `aria-controls`). Collapsed accordion
bodies are inert, labels wrap rather than truncate, and disclosure/subcategory
controls retain a 44px minimum target. Active categories use the canonical
accent bar; active leaves retain their existing `data-active` selectors.

The drawer is an owned Radix Dialog accessibility boundary: it has a dialog
title/description, focus trap, Escape and backdrop dismissal, and explicit
trigger focus restoration. Route changes close it. At tablet the visible
sidebar and drawer use the same complete category tree, while the drawer's
chrome (search, four canonical project links, and `CATEGORIES` label) follows
`layout.jsx` 500+ rather than inheriting the desktop quick-nav/footer layout.

## Integration handoff

`AppHeader` owns the trigger placement and its product-facing label. The
sidebar primitive hides that trigger above `1024px` and routes it to the
drawer at `1024px` and below; no header markup or behavior was changed here.
`MainLayout` owns `--header-height`, the row/flex composition, and page
content. The sidebar consumes that offset and does not add an overflow
scroll-container ancestor around the shell, preserving sticky behavior.