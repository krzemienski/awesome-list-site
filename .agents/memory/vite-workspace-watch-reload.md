---
name: Vite watches the whole workspace
description: Any file write in the repo (source, markdown, touch, directory delete) during a browser run reloads every open app page; stage outputs in a watcher-excluded dir and never edit docs mid-run.
---

# Vite dev watcher covers the entire workspace

The Vite dev server's file watcher is not limited to `client/` — `vite.config.ts`
excludes only `.local`, `.cache`, `.config`, `.git`, `node_modules`, `dist`,
`_planning`, `attached_assets`, `.agents` and `*.log`. Creating, appending
(`tee`), touching, or deleting files anywhere else in the repo while a browser
session is open triggers `[vite] page reload <file>` on every open app page.
Observed triggers: a markdown edit under `docs/`, a `touch` on a worklog, and
`rm -rf` of a superseded results directory under `tests/`.

**Why:** During Playwright verification sweeps, writing evidence/log files into
the repo mid-run caused in-flight navigations to abort (`net::ERR_ABORTED`)
and produced flaky, non-reproducible test failures that looked like app bugs.
In the parity harness a reload between the settle check and the frames turned
a full React page into a 2 634-px crawler prerender that two stability frames
agreed on — a wrong measurement, not a visible failure.

**How to apply:** While any Playwright/browser session is live against the dev
server, write nothing into the watched tree: stage under `/tmp` or a
watcher-excluded, git-ignored dir such as `.cache/` and `cp` into the repo
only after the browser work completes (prefer `.cache/` for anything that must
survive a workspace restart — `/tmp` and `/home/runner` outside the repo are
wiped). Same for deleting temp scripts or old result dirs — between runs, not
during. Harnesses that take long-lived captures should stamp the settled
document and re-verify it around every frame (see the headless capture memory).

## The reload masquerades as an app bug

The reload does not always surface as `ERR_ABORTED`. When it lands mid-sign-in,
the reload discards the in-flight auth state and the gate reports a **Clerk
sign-in failure** — an app-shaped error with no hint that a file write caused
it. This burned several debugging cycles chasing a non-existent auth bug.

**How to apply:** If a browser gate fails on auth/session state, first ask
whether anything wrote to the repo during the run (the app workflow log shows
the `[vite] page reload` line with the file name). Re-run with the working tree
completely quiet before investigating the app. Corollary: when a gate suite is
running, do not edit source, write evidence, or update docs — batch all writes
for after the last gate reports.
