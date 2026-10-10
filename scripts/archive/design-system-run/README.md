# Archived: Claude design-system run launchers

`run-ds.sh` and `setup-ds-run.sh` launched the one-off interactive Claude Code
design-system run that produced the Claude Design adoption (Editorial ×
Crimson). That run is finished and merged.

They are archived rather than registered as runbooks because:

- they only work from a personal checkout (`~/Desktop/awesome-list-site`)
  with locally added MCP servers and an interactive `claude_design` login;
- running them starts a paid AI session, so no machine gate can exercise them;
- nothing in the repo (npm scripts, workflows, CI, other scripts) invokes them.

Kept only as a record of how that run was configured. Do not revive them
as-is: a future design run needs a fresh launcher with its own prerequisites.
