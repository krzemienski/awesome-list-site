---
name: Retired artifact leaves workspace residue
description: Why retiring a git-ignored artifact in a task-agent Repl can still break the publish build on main, and what to delete by hand.
---

Rule: when an artifact under `artifacts/` is retired (manifest removed, baseline entries dropped), also delete the directory from the MAIN workspace disk — a task-agent merge cannot do it.

**Why:** `/artifacts/*` is git-ignored except the maintained design-system artifact. A task agent that retires an artifact removes its `.gitignore` exception, its baseline allowances and its tracked files, but the merge into main only touches tracked paths; the ignored source, `dist/`, `node_modules/` and the `.replit-artifact/artifact.toml` manifest stay on main's disk. The publish build snapshots the workspace filesystem (ignored files included), so `standalone-palette-drift` rediscovers the manifest, scans the leftover source against a baseline that now allows 0, and blocks publishing (2026-09-15: `artifacts/mockup-sandbox`, 244 MB of residue).

**How to apply:** after any merge that retires/deregisters an artifact, run `ls artifacts/` on main and `rm -rf` the retired directory, then rerun `npm run validate:standalone-palette-drift`. Also sweep stray manifest-only stubs (a failed artifact scaffold left `artifacts/awesome-video-ds/.replit-artifact/artifact.toml` with empty dirs) — the gate counts any manifest as a root. Reproduce publish-gate failures locally with `bash scripts/pre-publish-gate.sh --publish` (safe: trim step needs `REPLIT_DEPLOYMENT=1`).
