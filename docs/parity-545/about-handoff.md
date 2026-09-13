# About page parity handoff

## Owned surface

- `client/src/pages/About.tsx`
- `client/src/styles/pages/about.css`

The page imports its scoped stylesheet directly. No shared, frozen, shell, or
canonical source files were edited.

## Implemented

- Added the canonical AboutPage opening shape from
  `awesome-list-site-ds/pages.jsx`: a 760px column, `ABOUT THIS
  PROJECT` eyebrow, editorial display heading, shimmer rule, lead card, and
  responsive callout-card grid.
- Kept the live Awesome Video lead copy and source-of-truth wording rather than
  copying canonical claims that are not established by this application.
- Retained the existing maintainer, source/platform, features, technology,
  accessibility, credits, and FAQ content. Maintainer bio paragraphs continue
  to render directly from `MAINTAINER` in `shared/about-content.ts`.
- FAQ questions and answers continue to come from `getAboutFaqs(...)`, including
  the live resource-count input. FAQ rows are now keyboard-accessible buttons
  with `aria-expanded`, `aria-controls`, labelled `role="region"` panels, and
  hidden collapsed answers.
- Preserved existing `link-about-deletion` and `link-about-github-issues`
  testids and destinations. Added explicit About-page links to `/terms` and
  `/privacy`; the existing shell footer legal links remain outside this owned
  surface and were not changed.

## Honest residuals / differences

- The canonical reference AboutPage only contains the opening editorial
  composition and four design-source callouts. The app still needs its
  maintainer, legal/data-deletion guidance, source links, feature/technology
  details, credits, and shared FAQ for product, SEO, and accessibility
  contracts, so those retained sections follow the opening as a documented
  residual.
- Canonical callout prose includes assertions such as quarterly snapshots,
  every entry being tested, and terminal-first readability. Those assertions
  were not copied because this application does not establish them. Callouts
  instead use existing app/shared-source statements.
- The canonical standalone page's exact static list totals are not used.
  Resource-count language remains sourced from the live catalog through
  `getAboutFaqs`, avoiding a stale or invented number.
- No browser capture or pixel/a11y gate was run by this subtask; parent
  coordination owns visual verification at 375/768/1024/1440 and any
  integration-level shell differences.