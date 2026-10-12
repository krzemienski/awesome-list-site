---
name: Initial bundle must stay zod-free
description: Shared-module import boundary that keeps schema validation out of the initial browser bundle.
---
Browser shell code and anything it imports eagerly must use zod-free shared
facet constants rather than importing schema-validation modules.

**Why:** found on 2026-10-10 while proving publish-time enforcement. The worktree failed bundle-budget; a bisect pointed at the "prior to merge" snapshot of parallel work.
**How to apply:**
- If a shared module is needed in the shell, check its import chain for zod/drizzle first.
- To diagnose a bundle-budget failure, build the last successfully published commit in /tmp and compare initial module sets from `dist/public/bundle-modules.json`. Normalize symlinked node_modules paths before comparing.
