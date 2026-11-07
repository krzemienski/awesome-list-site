# C7 PC02 (ux-public-core: drawer, sidebar states, breadcrumbs, footer, consent, palette)
Worker: sonnet a44ba96daaf388861. Revision 130e5829 (15:45Z-15:55Z). Method: chrome-devtools isolatedContext, signed out, real touch emulation at 820/390. Evidence: e2e-evidence/cycle-07/PC02/.
Verdict: 0 confirmed defects. Rows 013-024 PASS (caveats: some palette and footer checks at 820/390 used DOM clicks or size reads only).
- C7-PC02-01 DISMISSED (by design): the resource breadcrumb disclosure is inside the sr-only shell breadcrumb with tabIndex -1. origin/main PageBreadcrumb.tsx:233-241 documents this: the shell breadcrumb is visually hidden on every route, stays in the AX tree, and is kept out of the Tab order on purpose; visible trails come from page chips. The brief's target rule excludes sr-only.
Lead spot-check: viewed 014-navfail-category-1440.png ("Couldn't load categories." + Retry, footer "Catalog unavailable") — matches.
Gaps: palette keyboard paths and consent Escape were not driven at touch widths (no hardware keyboard in touch emulation; acceptable).
