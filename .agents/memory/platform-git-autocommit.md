---
name: Platform git auto-commit and sync
description: Agent edits get auto-committed on main and GitHub main can move without an explicit push.
---

The platform auto-commits the agent's working-tree edits on main (author "Replit Agent", generic messages). During one audit session, GitHub `origin/main` also moved to that auto-commit without any `git push` from the agent.

**Why:** the brief required "never merge to main on GitHub; push to a side branch". The platform's sync made main contain the fixes anyway.
**How to apply:** before reporting git state, run `git ls-remote origin refs/heads/main` and say plainly if main already holds the work. Push side branches with `git push origin HEAD:refs/heads/<branch>`; plain push works from bash.
