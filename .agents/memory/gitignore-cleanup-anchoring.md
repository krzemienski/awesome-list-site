---
name: Gitignore cleanup-pattern anchoring
description: Root-anchor bulk-cleanup ignore patterns or they shadow kept dirs at depth (docs/screenshots)
---

Rule: when adding .gitignore patterns to block re-accumulation of deleted clutter dirs, anchor them to repo root (`/screenshots/`, `/artifacts/`, `/evidence/`, ...).

**Why:** an unanchored `screenshots/` matches at ANY depth, so it silently shadow-ignored the KEPT `docs/screenshots/` (live source embedded in README, written by capture scripts). Existing tracked files keep committing, but NEW files there are silently excluded — quiet doc-rot. Caught only by architect review during the July 2026 deep clean.

**How to apply:** after any .gitignore change, verify with `git check-ignore -v --no-index <kept-path>/probe.png` (must exit 1) and `git ls-files -i -c --exclude-standard` filtered to files still on disk (must be empty). Generic dir names (artifacts/, banks/, screenshots/) are the biggest foot-guns.
