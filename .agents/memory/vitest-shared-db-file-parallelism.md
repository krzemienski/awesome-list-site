---
name: Shared test DB vs vitest file parallelism
description: Why integration tests that pass alone fail (500/401/never-429) inside the full suite, and why test:integration runs files serially.
---

**Rule:** the integration suite has ONE shared test database and every file
runs `cleanupDatabase()` in its hooks. Never run those files in parallel
workers (`test:integration` passes `--no-file-parallelism`; keep it, and add
the flag to any new script or workflow that runs more than one DB-backed file).

**Why:** vitest's default runs every file in its own worker at the same time,
so a sibling file's cleanup deletes your `users` row between insert and request
(FK violation → 500, admin lookup → 401) and truncates `rate_limit_hits`
mid-test (six requests all 200, the 429 never comes). A brand-new suite went
16/16 alone and 12/16 in the full run for exactly this reason, and the legacy
files' failing set "drifted by a few names between identical runs" — that
drift was the same interference, not data nondeterminism: serial runs are
byte-stable (0 drifted tests across base/after) and pass more of the legacy
files (+16) at ~2× wall time (21 s → 47 s).

**How to apply:**
- A test that passes in isolation and fails only in the suite with 401/500/
  missing-429 shapes is a cross-file wipe until proven otherwise; rerun the
  file with `--no-file-parallelism` before touching app code.
- Per-test baseline diffs: `vitest run ... --reporter=json --outputFile=` in
  both trees, key on `file > fullName`; only serial runs give a stable set.
- The shared PG rate-limit store counts one request under EVERY mounted
  limiter's own name (backstop + route limiter) — assert `limiter = '<name>'`
  rows, not table totals, or a new limiter looks double-counted.
