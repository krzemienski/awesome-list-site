# Evidence — document-reload recovery (single-row diagnostic run)

`results.json` is the run that proved the settle-stamp check against a real
full reload of the app page, not a mock:

- The run captured `app.about @ 768` while a workspace file was touched from
  another shell six seconds after the cell started (`touch
  docs/parity/worklog/harness.md`). The app's Vite dev server reloads every
  open page when its watcher sees a change — the same event that, in an
  earlier full run, put the crawler prerender's hold overlay (`#ssr-seo-hold`)
  in front of the About page after the React-mount check had already passed,
  so two identical frames of the overlay were accepted and diffed as "the
  app" (768 × 2 634 px instead of the 4 597 px page).
- `configuration.documentReloads[0]`: `"document reloaded before frame 1
  (settle stamp gone; page is now http://127.0.0.1:5000/about)"`, phase
  `capture`, round 1; the row carries
  `actualCaptureStability.reopenedAfterReload: 1`.
- The reopened side (fresh context, full settle) produced a 768 × 4 597 px
  capture whose SHA-256 (`348fc584…`) is byte-identical to the two clean
  diagnostic runs of the same cell taken minutes before and after, and the
  same 2 510 957 differing pixels against the reference.

The rule is described in `tests/parity/README.md` ("Capture rules"): the
settled document is stamped, every frame is bracketed by a stamp / hold /
React-container check, and a side that fails it is reopened at most twice.
Do not write files anywhere in the workspace while a run is in progress.
