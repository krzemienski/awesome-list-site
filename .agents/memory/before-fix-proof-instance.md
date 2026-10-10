---
name: Before-fix proof instance
description: How to run the pre-fix server code side-by-side for BEFORE evidence when the fix is still uncommitted.
---
To capture BEFORE evidence while your fix is uncommitted: copy server/ shared/ client/ migrations/ + root configs (package.json, tsconfig, vite/tailwind/postcss configs, .env) into /tmp/<dir>, symlink node_modules, overwrite the changed files with `git show HEAD:<file>`, and run it on a second port against the scratch DB.
**Why:** `git worktree add` writes into .git (blocked from bash) and a full copy of the repo is ~14 GB; `setsid nohup … &` instances die when the shell call returns.
**How to apply:** start both instances via ShellExec run_in_background (not nohup), kill by task id; never point the old-code instance at DEV for destructive recipes.
