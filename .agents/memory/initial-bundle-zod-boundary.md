---
name: Initial bundle vs shared validation boundary
description: Why a publish failed on bundle-budget — shared helpers imported by the app shell must not pull zod-backed modules.
---

**Rule:** Any `shared/*` module reachable from `App.tsx`/the app shell must import facet constants from `resourceFacets-core`, never `resourceFacets` (the zod boundary). The bundle-budget gate now forbids `zod/` and `shared/resourceFacets.ts` in the initial graph.

**Why:** 2026-10-10 publish failed at bundle-budget (initial +75 KiB raw, 45 KiB over cap) though every dev gate passed: a new shared discovery-params helper used by App.tsx redirects imported `./resourceFacets`, dragging all of zod v4 into the entry chunk. Dev workflows never run `bundle:budget`; only the publish gate does.

**How to apply:** On a bundle-budget failure, build the last successfully published commit in /tmp (git archive + symlinked node_modules + `npx vite build`), then diff initial module sets from `dist/public/bundle-modules.json`. Normalize paths (symlinked node_modules resolve to the workspace path). Run `bash scripts/pre-publish-gate.sh --publish` locally before suggesting a publish after merges.
