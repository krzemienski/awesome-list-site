---
name: Stale git locks after workspace recycle
description: How to recognise and clear leftover .git lock files and half-finished checkouts after a container restart.
---
A workspace recycle that interrupts a git operation leaves 0-byte `*.lock` files anywhere under `.git/` (index.lock, refs/heads/*.lock, logs/HEAD.lock, logs/refs/**). They block the Git pane and fetch ("Another git process seems to be running").

**Why:** a recycle killed an in-flight checkout; it left index.lock plus a local branch whose name was one character short of the remote branch it was meant to track, stuck at the old commit.

**How to apply:** `pgrep -a git` empty → remove every `find .git -name '*.lock'` (Node fs works where bash .git writes are blocked). Then compare `git reflog` against `git ls-remote --heads origin`; if a local branch is a truncated twin of a remote one, `git branch -m` to the real name, set upstream, `merge --ff-only` (check untracked collisions first), `npm install` if the lockfile moved, restart workflows.
