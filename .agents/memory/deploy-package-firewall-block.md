---
name: Deploy-time package firewall blocks
description: Publish builds can fail on CVE-flagged deps that install fine in dev; fix by upgrading, never retrying. Merged-in guard tests may assert fixes the remote never shipped.
---

# Deploy-time package firewall blocks

**Rule:** A deployment build's `npm install` routes through Replit's supply-chain firewall (`package-firewall.replit.local`). A dependency flagged for a Critical CVE gets E403 at publish even though it installed fine in dev earlier. Retrying the same publish always fails — the block is on the package version, not the build.

**Why:** A publish failed because `vitest@2.1.9` (devDependency) was flagged; the prior publish hours earlier had succeeded with the same lockfile — flags can be applied between publishes.

**How to apply:** Read the failed build's logs for `403 Forbidden ... Blocked by Security Policy`, identify the package@version, upgrade it via the packager tool (so package.json + lockfile both change), confirm the lockfile no longer references the flagged version, run the test suite + `npm run build` locally, then republish. Major-version bumps of test runners are safe to take: only install matters for the build (devDeps never run in `vite build`), but run the suite anyway to keep it green.

**Related gotcha — merged guard tests without their fixes:** an external "remediation" merge shipped static-source guard tests (grep-the-source assertions) whose corresponding source fixes were NOT in the merged tree, so the suite failed on both sides' code. Response: implement the small real fixes the tests demand (they encode good a11y/UX rules), and rewrite only genuinely unmatchable brittle regexes (e.g. walk-back-from-first-occurrence heuristics that collide with `${...}` template literals) while preserving the exact invariant being guarded.

**Sidebar wrap/clip lesson:** switching sidebar labels from `truncate` to `break-words` under a numeric `max-height` accordion requires measuring real content height (`scrollHeight` in a post-commit effect, `Math.max` with the row calculator) or wrapped rows get permanently clipped.
