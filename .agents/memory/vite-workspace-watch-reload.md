---
name: Vite watches the whole workspace
description: Any file write in the repo (source, markdown, touch, directory delete) during a browser run reloads every open app page; stage outputs in a watcher-excluded dir and never edit docs mid-run.
---

**Rule:** while any browser session is live against the dev server, write
nothing into the watched tree. The watcher excludes only `.local`, `.cache`,
`.config`, `.git`, `node_modules`, `dist`, `_planning`, `attached_assets`,
`.agents` and `*.log`; a markdown edit under `docs/`, a `touch`, or `rm -rf`
of an old results dir under `tests/` all trigger `[vite] page reload` on
every open app page.

**Why:** the reload rarely looks like a reload. It surfaced as
`net::ERR_ABORTED` navigations, as a **Clerk sign-in failure** (the reload
discarded in-flight auth state — several cycles were spent chasing a
non-existent auth bug), and as a 2 634-px crawler prerender that two
stability frames happily agreed on (a wrong measurement, not a failure).

**How to apply:** stage under `.cache/` (survives workspace restarts; `/tmp`
does not) and copy into the repo after the last capture; delete temp scripts
and superseded result dirs between runs, never during. When a browser gate
fails on auth/session state, first check the app workflow log for a
`[vite] page reload <file>` line and re-run with a quiet tree before
investigating the app. Long-lived capture harnesses must stamp the settled
document and re-verify it around every frame (see the headless capture memory).
