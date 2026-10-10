---
name: Initial bundle must stay zod-free
description: Why the pre-publish bundle-budget gate blew up after the 10-09 parallel wave, and the shared-module import rule that prevents it.
---
Browser shell code (App.tsx and anything it imports eagerly) must import shared facet constants from `shared/resourceFacets-core`, never `shared/resourceFacets` (which pulls in zod, ~70 KiB raw). One innocent `discovery-params` import added to App.tsx pushed the initial bundle 45 KiB over budget, so **main could not publish**. Every task's own gates were green, because only the publish gate runs bundle-budget.

The bundle-budget config now forbids `zod/` in the initial graph, so a regression shows up as an isolation violation that names the module.

**Why:** found on 2026-10-10 while proving publish-time enforcement. The worktree failed bundle-budget; a bisect pointed at the "prior to merge" snapshot of parallel work.
**How to apply:**
- Before asking the owner to republish, run the real gate. This also works offline in a /tmp copy: `bash scripts/pre-publish-gate.sh --publish` with `BUILD_REVISION` set, because there is no .git.
- If a shared module is needed in the shell, check its import chain for zod/drizzle first.
