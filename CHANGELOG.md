Earlier entries: [docs/history/CHANGELOG-through-2026-11-12.md](docs/history/CHANGELOG-through-2026-11-12.md)

## November 13, 2026

### Password text clears the show-password toggle (#402)
- On sign-in and sign-up, a long password no longer runs under the "Show password" button; the field keeps room for it at every width.

### Fewer layout jumps on phones (#401, #402, #404)
- The admin research run view, a search link with a category filter, and a shared collection page no longer shift their content while they load on a phone.

### Offline retry restores the page's styles (#405, #406)
- If a page failed to load while offline, coming back online (or pressing Retry) now reloads its stylesheet too, so the page no longer appears unstyled.

### A mistyped research budget is rejected (#407)
- In the admin researcher wizard, text that is not a number (for example "0-1") in the budget, turns or duration field now shows the invalid-value message instead of silently meaning "no cap".

### Clerk sign-in errors appear in the admin logs (#403)
- A server error (5xx) returned through the sign-in proxy, or a failure to reach Clerk, is now recorded at error level in the admin logs, so the error count covers sign-in traffic too. A visitor closing the page mid-request is not recorded, and Clerk ids in the logged path are masked even when percent-encoded.

### Run report (2026-11-13)
- The production state after this run, with the architecture diagram, is in `docs/production-state-2026-11-13.md`.

### The harness and self-repair layer no longer runs (#381)
- The orphan-job watchdog no longer sweeps every 60 seconds. It runs once at server start to fail jobs a restart stranded. A GitHub sync row that has been processing for over 5 minutes is failed at that point even if a sibling instance is still running it, because that queue records no worker liveness. Link health scans only plan changes now: nothing is hidden or rewritten unless an admin presses Apply in the Link health panel, and `LINK_HEALTH_REMEDIATION` is gone.
- Agent tooling, the TLA+ models, one-off scripts and the separate lint pass in the build were removed from the repository. The build runs `tsc --noEmit`, then the Vite, SSR and server bundles.
- `reports/`, `audit/` and the old changelog moved to `docs/history/`; nothing was deleted. The public cache now logs one warning when it evicts live entries.

### Link health panel says "Remediation plan" (#383)
- The admin Link health card was headed "Automatic remediation". It now reads "Remediation plan", because nothing is applied until an admin presses Apply.

### Admin pages no longer jump while loading (#384, #385, #386, #387, #389, #395)
- Link health, the admin overview, Categories, Enrichment and GitHub keep their masthead and card heights while data loads, so nothing below them moves when it arrives. The remediation plan table is one card with a fixed-height scrolling body; every row stays reachable. The overview's Recent activity and Top categories panels reserve their rows, the Enrichment stat tiles reserve two lines, and the GitHub repository block takes its own row on narrow screens.
- The Link health "last scan" row always shows and reads "No scan has finished yet." before the first scan.

### Pages stay up during crawler bursts (#388)
- A burst of requests for many uncached category, subcategory and tag pages used to be turned away with a shed page or a 503, including some real browsers. Those requests now wait up to 5 seconds for a rebuild slot and are served. A request that finds no slot after 5 seconds, or arrives when 512 are already waiting, still gets a 503.

### A failed lookup no longer sticks in page titles (#394)
- If a page's data lookup failed while the server built it, the generic site title could stay on that resource or category URL for hours. The fallback is now served once and never cached, so the next request retries.

### Catalog edits reach every server within about 30 seconds (#396)
- After an admin edit, withdrawal or tag change, other running server instances could keep showing the old page for up to 6 hours. Each serving instance now checks a fingerprint of the catalog at most every 30 seconds and clears its cache when it changes. The check runs when a page is requested and is not waited for, so the first request after the 30 seconds can still show the old page. If the check fails, nothing is cleared until the next request after another 30 seconds.

### Link names match what you see, with a space before the count (#390, #391, #398)
- Sidebar rows, category and tag tiles and the Favorite and Bookmark buttons now have accessible names that start with their visible text (for example "Codecs 74 resources"), and the visible label and count are separated by a space. Home category headings, the type chips and the search facet and tag buttons now also start with their visible text. This meets WCAG 2.5.3 Label in Name.

### Admin tabs keep keyboard focus (#399)
- After opening an /admin/<section> link, choosing another admin tab with the keyboard keeps focus on the tabs instead of jumping to the page heading. The admin pages now use a single route.

### Removing a bookmark while signed out no longer errors (#392)
- A signed-out visitor removing a bookmark no longer triggers a request to the signed-in bookmarks list, a 401, or a console error. Undo still restores it.

### Visit button responds faster on phones (#393, #397)
- The Visit button on a resource page records its analytics after the tap's frame instead of during it, and the hide path no longer blocks the tap. Amplitude Guides and Surveys now start in an idle period 3 seconds after the page loads.

### Database connection and traffic counts (#382, #389)
- The database connection now sends TCP keepalives, to stop idle connections dropped by a proxy from hanging queries. Page-view counts are saved one last time when a server instance goes idle, and idle instances no longer run the 5-minute traffic save.
