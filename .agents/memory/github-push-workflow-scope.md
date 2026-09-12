---
name: GitHub push with workflow files
description: Why pushes touching .github/workflows fail and how to push from this environment
---

# GitHub push — workflow scope + sandbox quirks

**Rule:** GitHub credentials that can push ordinary code may still lack permission to update `.github/workflows/*`. Diagnose the actual remote error rather than treating every push failure as a workflow-scope problem.

**Why:** GitHub hard-blocks OAuth-app tokens from modifying CI definitions. The failure looks like a generic push failure but the remote-rejected line names the workflow file.

**How to apply:**
- Check secret existence before choosing an authentication path; previously documented secret names may no longer exist.
- Push non-workflow commits first if needed: pushing a prefix SHA (`git push origin <sha>:refs/heads/main`) works with the connector token as long as that range doesn't touch workflows.
- Never embed the token in the remote URL; use a `GIT_ASKPASS` script that echoes an env var (`Username → x-access-token`, password → token), and sanitize any command output before printing.

## Environment-specific diagnosis
- The platform askpass helper can return invalid Git credentials even while the GitHub integration reports healthy. An existing valid PAT through an askpass helper can authenticate without reconnecting the integration.
- `GIT_ASKPASS` overrides repository `core.askPass`; verify the intended path rather than assuming a Git config change overrides the environment.
- Never put credentials in a remote URL, shell command argument, or tracked helper. A helper should reference a secret environment variable and fail explicitly if absent.
- As of 2026-09-12, ordinary shell fetch, fast-forward merge, and push work; old claims that these are universally blocked are stale. Respect actual tool restrictions if encountered.
- Stale `.git/*.lock` files (from interrupted operations) block the user's Git pane too; check lock file mtimes vs running git processes before assuming auth problems.
- The code-execution notebook's `process.env` does NOT pick up secrets added after the notebook process started — freshly added secrets are visible in new bash sessions instead.
