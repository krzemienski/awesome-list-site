# VG-022 — BUG-022 (LOW): Breadcrumb middle ellipsis is dead

## Root cause
Below xl (1280px) the header breadcrumb collapses middle crumbs into `BreadcrumbEllipsis` — a `role="presentation" aria-hidden="true"` **span**. The crumbs it stood for were completely unreachable at md–lg widths: not clickable, not focusable, invisible to AT.

## Fix
`client/src/components/layout/new/AppHeader.tsx`: the ellipsis is now a real `DropdownMenu` trigger **button** (`data-testid="button-breadcrumb-ellipsis"`, aria-label "Show N hidden breadcrumb levels", visible focus ring) whose menu lists every hidden middle crumb as a navigable wouter `Link` (SPA nav). Unused dead `BreadcrumbEllipsis` import removed.

## Live evidence (Playwright @1024px, deep 4-level route `/sub-subcategory/online-forums`, 9/9 PASS)
- Ellipsis renders as `BUTTON` with aria-label "Show 2 hidden breadcrumb levels", not aria-hidden (`bug022-collapsed-1024.png`).
- **Mouse**: click opens menu listing exactly the hidden crumbs "Community & Events" → `/category/community-events`, "Community Groups" → `/subcategory/community-groups` (`bug022-menu-open.png`); clicking the first navigates there.
- **Keyboard**: trigger is in the tab order, takes focus, Enter opens, ArrowDown focuses "Community & Events" (`bug022-keyboard-open.png`), Enter navigates to the focused hidden crumb (landed `/subcategory/community-groups`).
- Escape closes the menu without navigating (path unchanged).
- Collapsed trail stays understandable: "Home › … › Current" with the … now meaningful and labeled.

**Hygiene**: tsc clean; read-only probes, no data created.

**Verdict: PASS**
