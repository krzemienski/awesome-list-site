---
name: Reproducing the publish gate offline
description: How to run the exact deploy build gate against a /tmp copy to demonstrate blocking defects without touching production.
---
Copy the tree to /tmp with tar (there is no rsync). Exclude node_modules, .git and evidence PNGs, but **keep** `.agents/` and `docs/`, because the standalone-palette gate reads the in-repo skill and `docs/parity/source-sync.json`. Symlink node_modules, but copy `node_modules/typescript`, because tsBuildInfo lives inside it.

Run `BUILD_REVISION=<sha> DATABASE_URL=postgres://invalid bash scripts/pre-publish-gate.sh --publish`. This proves the gate opens no DB. The build needs `BUILD_REVISION` when git metadata is absent, otherwise the build fails falsely.

**Why:** an owner-authorized disposable deploy isn't available to agents. This reproduces the deploy build command exactly, with injected type, unjournaled-migration and real budget defects.
**How to apply:** use it for any "would publish block?" question. A missing file causes a false ENOENT failure, not a real one.
