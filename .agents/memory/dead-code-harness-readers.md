---
name: Dead-code gates miss harness source readers
description: dead-components/dead-exports scan imports in client/shared only; tests/parity reads app source files by path, so deleting/un-exporting can break deep gates while both dead-code gates pass.
---

Before deleting a component or dropping an `export` that dead-components / dead-exports flagged,
grep `tests/ scripts/ .agents/skills/awesome-ds-verify` for the file name AND the symbol names.

**Why:** the parity harness (`tests/parity/reference-reconciliation.mjs`) `fs.readFile`s app sources
and esbuild-imports them as data URLs to project source-owned geometry. Import-graph gates cannot
see that, so a "dead" file deletion passed both gates, then took down the deep run's axe phase
(parity-systems BLOCK) and pixel-parity with ENOENT ~20 minutes later.

**How to apply:** when a harness reads a module whose exports became private, have the harness
re-export from its own transpiled copy rather than re-widening the app module's public surface.
