Earlier entries: [docs/history/CHANGELOG-through-2026-11-12.md](docs/history/CHANGELOG-through-2026-11-12.md)

## Run 20261113T0041Z: one entry per production deploy (November 13–14, 2026)

Each entry is one production deploy, in order, from base 8a22a09d. "Live" is the SHA that `/api/version` served after the deploy, and the time is when it went live (UTC). A change that took several deploys is described under the deploy that completed it; the earlier deploys list their part by PR title.

### Deploy 1 — 2026-11-13 02:33Z, live 3519d90e (#381): The harness and self-repair layer no longer runs (#381)
- The orphan-job watchdog no longer sweeps every 60 seconds. It runs once at server start to fail jobs a restart stranded. A GitHub sync row that is processing and was queued more than 5 minutes ago is failed at that point, even if a sibling instance is still running it, because that queue records no worker liveness or processing start time. Link health scans only plan changes now: nothing is hidden or rewritten unless an admin presses Apply in the Link health panel, and `LINK_HEALTH_REMEDIATION` is gone.
- Agent tooling, the TLA+ models, one-off scripts and the separate lint pass in the build were removed from the repository. The build runs `tsc --noEmit`, then the Vite, SSR and server bundles.
- `reports/`, `audit/` and the old changelog moved to `docs/history/`; nothing was deleted. The public cache now logs one warning when it evicts live entries.

### Deploy 2 — 2026-11-13 03:19Z, live 5a995396 (#382, #383): Link health panel says "Remediation plan" (#383)
- The admin Link health card was headed "Automatic remediation". It now reads "Remediation plan", because nothing is applied until an admin presses Apply.
- TCP keepalive on the app pool; traffic flush only on serving instances (LG-009) (#382). Completed in Deploy 8.

### Deploy 3 — 2026-11-13 03:50Z, live 134a0672 (#384): Reserve the link health remediation panel's height while it loads (LG-013)
- Reserve the link health remediation panel's height while it loads (LG-013) (#384). Completed in Deploy 12.

### Deploy 4 — 2026-11-13 04:42Z, live f8f9e3a7 (#385): Bound the remediation plan table and keep the admin masthead's box while loading (LG-013)
- Bound the remediation plan table and keep the admin masthead's box while loading (LG-013) (#385). Completed in Deploy 12.

### Deploy 5 — 2026-11-13 05:20Z, live c794fb15 (#386): Keep the masthead node across loading and a same-size last-scan placeholder (LG-013)
- Keep the masthead node across loading and a same-size last-scan placeholder (LG-013) (#386). Completed in Deploy 12.

### Deploy 6 — 2026-11-13 05:41Z, live 5304a5d2 (#387): Fixed-height rows in every state for the link health panel and masthead; route-meta TTL doc (review comments #384-#386, LG-004)
- Fixed-height rows in every state for the link health panel and masthead; route-meta TTL doc (review comments #384-#386, LG-004) (#387). Completed in Deploy 12.

### Deploy 7 — 2026-11-13 05:49Z, live bd4bbc91 (#388): Pages stay up during crawler bursts (#388)
- A burst of requests for many uncached category, subcategory and tag pages used to be turned away with a shed page or a 503, including some real browsers. Those requests now wait up to 5 seconds for a rebuild slot and are served. A request that finds no slot after 5 seconds, or arrives when 512 are already waiting, still gets a 503.

### Deploy 8 — 2026-11-13 06:17Z, live 9e3b0b8f (#389): Database connection and traffic counts (#389)
- The database connection now sends TCP keepalives, to stop idle connections dropped by a proxy from hanging queries. Page-view counts are saved one last time when a server instance goes idle, and idle instances no longer run the 5-minute traffic save.
- Completes the change begun in #382 (Deploy 2).

### Deploy 9 — 2026-11-13 06:40Z, live f8e7b6a7 (#390): Accessible names start with their visible text (LG-019)
- Accessible names start with their visible text (LG-019) (#390). Completed in Deploy 13.

### Deploy 10 — 2026-11-13 07:12Z, live 35de20fb (#391): Separate visible name and count with a space so label-in-name holds (LG-019)
- Separate visible name and count with a space so label-in-name holds (LG-019) (#391). Completed in Deploy 13.

### Deploy 11 — 2026-11-13 07:33Z, live 8646a8b7 (#392): Removing a bookmark while signed out no longer errors (#392)
- A signed-out visitor removing a bookmark no longer triggers a request to the signed-in bookmarks list, a 401, or a console error. Undo still restores it.

### Deploy 12 — 2026-11-13 09:21Z, live 87c43144 (#393, #394, #395, #396, #397): Admin pages no longer jump while loading (#395); A failed lookup no longer sticks in page titles (#394); Catalog edits reach every server within about 30 seconds (#396); Visit button responds faster on phones (#393, #397)
- Link health, the admin overview, Categories, Enrichment and GitHub keep their masthead and card heights while data loads, so nothing below them moves when it arrives. The remediation plan table is one card with a fixed-height scrolling body; every row stays reachable. The overview's Recent activity and Top categories panels reserve their rows, the Enrichment stat tiles reserve two lines, and the GitHub repository block takes its own row on narrow screens.
- The Link health "last scan" row always shows and reads "No scan has finished yet." before the first scan.
- Completes the change begun in #384 (Deploy 3), #385 (Deploy 4), #386 (Deploy 5), #387 (Deploy 6), #389 (Deploy 8).
- If a page's data lookup failed while the server built it, the generic site title could stay on that resource or category URL for hours. The fallback is now served once and never cached, so the next request retries.
- After an admin edit, withdrawal or tag change, other running server instances could keep showing the old page for up to 6 hours. Each serving instance now checks a fingerprint of the catalog at most every 30 seconds and clears its cache when it changes. The check runs when a page is requested and is not waited for, so the first request after the 30 seconds can still show the old page. If the check fails, nothing is cleared until the next request after another 30 seconds.
- The Visit button on a resource page records its analytics after the tap's frame instead of during it, and the hide path no longer blocks the tap. Amplitude Guides and Surveys now start in an idle period 3 seconds after the page loads.

### Deploy 13 — 2026-11-13 10:03Z, live 7cca0be4 (#398, #399, #400): Link names match what you see, with a space before the count (#398); Admin tabs keep keyboard focus (#399)
- Sidebar rows, category and tag tiles and the Favorite and Bookmark buttons now have accessible names that start with their visible text (for example "Codecs 74 resources"), and the visible label and count are separated by a space. Home category headings, the type chips and the search facet and tag buttons now also start with their visible text. This meets WCAG 2.5.3 Label in Name.
- Completes the change begun in #390 (Deploy 9), #391 (Deploy 10).
- After opening an /admin/<section> link, choosing another admin tab with the keyboard keeps focus on the tabs instead of jumping to the page heading. The admin pages now use a single route.
- Changelog for 2026-11-13 deploy batches; correct docs for removed self-repair layer (#400).

### Deploy 14 — 2026-11-13 10:56Z, live 109c320a (#401): Research run view keeps its boxes while the job loads (LG-027)
- Research run view keeps its boxes while the job loads (LG-027) (#401). Completed in Deploy 16.

### Deploy 15 — 2026-11-13 13:59Z, live b1e4db3a (#402, #403): Password text clears the show-password toggle (#402); Clerk sign-in errors appear in the admin logs (#403)
- On sign-in and sign-up, a long password no longer runs under the "Show password" button; the field keeps room for it at every width.
- A server error (5xx) returned through the sign-in proxy, or a failure to reach Clerk, is now recorded at error level in the admin logs, so the error count covers sign-in traffic too. A visitor closing the page mid-request is not recorded, and Clerk ids in the logged path are masked even when percent-encoded.

### Deploy 16 — 2026-11-13 17:02Z, live 1a7ff534 (#404): Fewer layout jumps on phones (#404)
- The admin research run view, a search link with a category filter, and a shared collection page no longer shift their content while they load on a phone.
- Completes the change begun in #401 (Deploy 14), #402 (Deploy 15).

### Deploy 17 — 2026-11-13 18:05Z, live 2eeb7a58 (#405): Offline Retry re-requests the stylesheets the failed chunk load left behind (LG-034)
- Offline Retry re-requests the stylesheets the failed chunk load left behind (LG-034) (#405). Completed in Deploy 18.

### Deploy 18 — 2026-11-13 18:36Z, live 67c5e9b6 (#406): Offline retry restores the page's styles (#406)
- If a page failed to load while offline, coming back online (or pressing Retry) now reloads its stylesheet too, so the page no longer appears unstyled.
- Completes the change begun in #405 (Deploy 17).

### Deploy 19 — 2026-11-13 20:40Z, live ec3f9204 (#407): A mistyped research budget is rejected (#407)
- In the admin researcher wizard, text that is not a number (for example "0-1") in the budget, turns or duration field now shows the invalid-value message instead of silently meaning "no cap".

### Deploy 20 — 2026-11-13 23:58Z, live 072818eb (#408): Production state report for 2026-11-13 and remaining changelog entries
- Production state report for 2026-11-13 and remaining changelog entries (#408).

### Deploy 21 — 2026-11-14 00:53Z, live b0c7fb47 (#409, #410, #411): Review findings fixed (#409, #410, #411)
- An instance that is serving requests checks for catalog edits at most every 30 seconds, and the check now also catches two edits in the same millisecond and tag changes that do not touch the edit time.
- A research budget that the browser cannot read as a number is now blocked when you press Launch, even if the field never fired a change event.
- The admin dashboard tab follows the URL. The research run view focuses its heading once the run loads. Offline Retry keeps the error card when the stylesheet fails to load again, instead of showing an unstyled page. A shared collection page no longer reserves a full screen of empty space while it loads.
- Sign-in proxy errors are logged after the response finishes, and a visitor closing the page is not logged as an error. A failed link-health progress write logs its cause as a warning.

### Deploy 22 — 2026-11-14 03:23Z, live 5f29bfd8 (#412): Typing after a submission keeps every keystroke (#412)
- After a resource is submitted, the success card takes focus once for that submission. Before, it took focus again on every render, so the next submission on the same page lost keystrokes as focus jumped back to the card.

### Deploy 23 — 2026-11-14 05:04Z, live a56ce260 (#413): Review findings fixed (#413)
- Following a research run you just launched now moves focus to its review once it ends, even when the jobs list refreshes at that moment or the run had already ended. Opening an older run does not move focus.
- One Launch click with an unreadable number now always ends in a result: the invalid field gets focus, or the confirm opens.
- Offline Retry no longer acts on a newer error, and keeps the error card if another stylesheet fails while it reloads.
- Amplitude Guides & Surveys waits for a quiet moment on Safari as well, and comes back after consent is withdrawn and granted again.

### Deploy 24 — 2026-11-14 08:53Z, live f0529d3d (#414): Production state report and changelog for #409–#413
- Production state report and changelog for #409–#413 (#414).

### Deploy 25 — 2026-11-14 10:00Z, live c68a4257 (#415): Catalog stamp catches same-millisecond writes; boot sweep spares live syncs; edit dialog shows failures inline (LG-039/040/041)
- Catalog stamp catches same-millisecond writes; boot sweep spares live syncs; edit dialog shows failures inline (LG-039/040/041) (#415). Completed in Deploy 26.

### Deploy 26 — 2026-11-14 11:24Z, live 980f031e (#416): Catalog freshness, GitHub syncs and the edit dialog (#416)
- Every catalog write now changes the cache stamp, including two writes to the same resource in the same millisecond.
- Restarting a server no longer marks a GitHub sync as failed just because it was queued more than 5 minutes ago. A sync records when it started and refreshes a heartbeat at its progress points (at most every 30 seconds). At startup, a processing sync is failed only when its last start or heartbeat is more than 5 minutes old; a sync from before this change, with neither recorded, is still judged by when it was queued. A sync still pending after 7 days is failed as before.
- A failed edit suggestion now shows its error inside the dialog, above the buttons, instead of a notice that covered the Submit button. The buttons stay in view, and a duplicate URL moves focus to the URL field.
- The Report broken link dialog opens empty each time instead of showing a note from an earlier, cancelled attempt.
- Completes the change begun in #415 (Deploy 25).

### Deploy 27 — 2026-11-14 14:44Z, live d286347a (#418): The startup sweep cannot be stopped by a bad timestamp (#418)
- A GitHub sync row whose recorded start or heartbeat time is not a valid timestamp no longer stops the startup cleanup for every other row. The value is treated as missing and the next fallback applies, a sync that heartbeats while the cleanup runs is left alone, and an error on one row no longer skips the rest.

### Deploy 28 — 2026-11-14 18:11Z, live 4430de28 (#419): Production state report and changelog for #415–#418
- Production state report and changelog for #415–#418 (#419).

### Deploy 29 — 2026-11-14 21:37Z, live 96f062ef (#420, #421): Review-thread fixes on the server (#420); Review-thread fixes in the browser (#421)
- Scheduled backups and link-health scans that come due on an idle server now wait until it serves traffic, instead of being skipped.
- "Similar" lists put dated resources first; a database connection error no longer fails an unrelated request; the home page falls back on time instead of rendering late; reporting a broken link always returns the report; an unknown contact message id returns 404, and the API description no longer lists a 200 it never sends.
- The resource page's next steps say "temporarily unavailable" when related resources fail to load, and the Similar card keeps its height.
- The admin health banner shows a warning ahead of running jobs; admin queues keep their rows with a stale-data notice when one refresh fails, and hide them after a sign-in expires.
- Scroll positions are never stored for sign-in, sign-up or password-reset pages, and moving to a new page jumps to the top instead of animating.
- Analytics is off from the very first page view on non-production hosts and in automated browsers; the community metrics card says "Couldn't load." with Retry; the contact inbox delete no longer gets stuck and returns to the previous page when the last message is deleted.

### Deploy 30 — 2026-11-14 23:02Z, live 911b5cc8 (#422): Home hero font, Back to the top, expired admin sessions (#422)
- The home page hero no longer jumps when its italic font finishes loading on a first visit.
- Going Back or Forward to a page with no saved position jumps to the top instead of animating.
- When an admin's session expires, the resource list stops showing rows until a fresh response arrives.

### FINAL — production state report (this commit)
- The production state after this run, with the architecture summary and every deploy's record, is in `docs/production-state-2026-11-13.md`. This commit changes only that file and this changelog; it ships no code.

