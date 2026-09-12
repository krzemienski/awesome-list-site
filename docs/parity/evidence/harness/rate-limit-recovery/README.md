# Evidence — 429 recovery (single-row diagnostic run)

`results.json` is the run that proved the header-driven rate-limit guard
against the real limiter, not a mock:

- The run started while the app's `ai-generation` window (10 per 15 min per
  IP) was already full from an earlier run.
- `app.home.index @ 375` received a real `429` from `POST /api/recommendations`
  (`configuration.throttleWaits[0]`: `waitedMs` 207 195, "429 received (window
  filled before this run); reopening once").
- The reopened side settled with API idle and produced 1 272 620 differing
  pixels — within one pixel of the unthrottled capture of that cell in the
  full run (1 272 619; the frozen clock is a different minute, and the home
  page renders one relative-time literal).

`app.home.index-375.diff.png` is the diff image from that reopened capture.
Waits are excluded from the 150 s row budget; see `tests/parity/README.md`
("Rate-limit budget").
